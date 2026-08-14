import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { ConversationsService } from "../conversations/conversations.service";
import { GroqLlmService } from "../llm/groq-llm.service";
import { LLMMessage, LLMTool } from "../llm/llm.types";
import { ContextBuilderService } from "../memory/context-builder.service";
import { MetricsService } from "../observability/metrics.service";
import { PrismaService } from "../prisma/prisma.service";
import { WebSearchService } from "../search/web-search.service";
import { UsageService } from "../usage/usage.service";
import { ChatStreamDto } from "./dto/chat-stream.dto";
import { SafetyService } from "./safety.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly conversationsService: ConversationsService,
    private readonly groqLlmService: GroqLlmService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly usageService: UsageService,
    private readonly safetyService: SafetyService,
    private readonly metricsService: MetricsService,
    private readonly webSearchService: WebSearchService,
  ) {}

  async *streamMessage(user: User, conversationId: string, dto: ChatStreamDto) {
    this.metricsService.incrementRequests();

    const canSend = await this.usageService.checkUserCanSendMessage(user);
    if (!canSend) {
      throw new ForbiddenException(
        "Hạn ngạch tin nhắn hôm nay của bạn đã hết.",
      );
    }

    const safety = this.safetyService.checkInput(dto.content);
    if (safety.decision === "BLOCK") {
      throw new BadRequestException(
        safety.safeResponse || "Message blocked by safety policy",
      );
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv || conv.user_id !== user.id) {
      throw new NotFoundException("Conversation not found");
    }

    const personalityCode = conv.personality_code || "friendly";
    const personality = await this.prisma.personality.findUnique({
      where: { code: personalityCode },
    });
    let systemPrompt =
      personality?.system_prompt || "Bạn là một trợ lý AI hữu ích.";
    if (conv.ai_nickname) {
      systemPrompt += `\nBiệt danh do người dùng đặt cho bạn trong cuộc trò chuyện này là "${conv.ai_nickname}". Hãy tự nhận biệt danh này khi giao tiếp và xưng hô tự nhiên.`;
    }

    // Add search tool instructions
    systemPrompt += `\n\nBạn có khả năng tìm kiếm thông tin tự động thông qua công cụ tra cứu web. Khi nhận được dữ liệu tìm kiếm, nhiệm vụ của bạn là TỔNG HỢP thông tin một cách ngắn gọn, mạch lạc, đầy đủ nội dung chính và giải đáp trực tiếp câu hỏi của người dùng. Tuyệt đối không chỉ trích dẫn thô hay lặp lại danh sách các đoạn văn tìm được. Cuối câu trả lời, luôn đính kèm mục "**📌 Nguồn tham khảo:**" với các link dạng Markdown [Tiêu đề](URL).`;

    // Create user message
    const userMsg = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: dto.content,
        status: "completed",
        client_message_id: dto.client_message_id,
      },
    });

    // Create assistant message placeholder
    const assistantMsg = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: "",
        status: "streaming",
        parent_message_id: userMsg.id,
      },
    });

    // Create usage event
    const modelName = this.configService.get<string>(
      "defaultLlmModel",
      "llama-3.3-70b-versatile",
    );
    const usageEvent = await this.prisma.usageEvent.create({
      data: {
        user_id: user.id,
        conversation_id: conversationId,
        message_id: assistantMsg.id,
        event_type: "chat_completion",
        model: modelName,
      },
    });

    // Emit message.created
    yield `event: message.created\ndata: ${JSON.stringify({
      message: this.formatMessage(assistantMsg),
      user_message: this.formatMessage(userMsg),
    })}\n\n`;

    // Fetch conversation history
    const windowSize = this.configService.get<number>(
      "conversationWindowMessages",
      20,
    );
    const pastMessages = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        id: { notIn: [userMsg.id, assistantMsg.id] },
        status: "completed",
      },
      orderBy: { created_at: "desc" },
      take: windowSize,
    });
    pastMessages.reverse();

    // Fetch active user memories
    const memories = await this.prisma.userMemory.findMany({
      where: { user_id: user.id, is_active: true },
    });
    const memoryPrompt = this.contextBuilder.buildMemoryPrompt(memories);

    const fullSystemPrompt = systemPrompt + memoryPrompt;

    let llmMessages: LLMMessage[] = [
      { role: "system", content: fullSystemPrompt },
      ...pastMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user", content: dto.content },
    ];

    const googleSearchTool: LLMTool = {
      type: "function",
      function: {
        name: "google_search",
        description:
          "Tìm kiếm thông tin trên Google khi cần dữ liệu mới nhất, thực tế, sự kiện, giá cả, thời tiết hoặc thông tin bạn không chắc chắn.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Từ khóa tra cứu trên Google",
            },
          },
          required: ["query"],
        },
      },
    };

    let fullAssistantResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const startTime = Date.now();

    try {
      // Step 1: Check if tool call is requested or query needs search
      let searchQuery = "";

      try {
        const initialRes = await this.groqLlmService.createCompletion({
          model: modelName,
          messages: llmMessages,
          tools: [googleSearchTool],
          temperature: 0.2,
          max_tokens: 300,
        });

        const toolCall = initialRes?.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall && toolCall.function?.name === "google_search") {
          try {
            const args =
              typeof toolCall.function.arguments === "string"
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;
            if (args?.query) {
              searchQuery = args.query;
            }
          } catch {
            searchQuery = dto.content;
          }
        }
      } catch (err: any) {
        this.logger.debug(
          `Tool call check non-streaming failed, fallback check: ${err.message}`,
        );
      }

      // Explicit query intention check fallback
      const isSearchIntent =
        searchQuery !== "" ||
        /hôm nay|mới nhất|tin tức|thời tiết|ở đâu|giá bao nhiêu|search|tìm kiếm|tra cứu|ai là|lịch sử|kết quả|năm 202[4-9]/i.test(
          dto.content,
        );

      if (isSearchIntent) {
        if (!searchQuery) searchQuery = dto.content;

        const searchingText = `🔍 *Đang tìm kiếm thông tin trên Google cho: "${searchQuery}"...*\n\n`;
        fullAssistantResponse += searchingText;
        yield `event: message.delta\ndata: ${JSON.stringify({
          id: assistantMsg.id,
          delta: searchingText,
        })}\n\n`;

        const searchResults = await this.webSearchService.search(
          searchQuery,
          5,
        );

        if (searchResults.length > 0) {
          let contextStr = `\n\n[DỮ LIỆU TÌM KIẾM CHO TỪ KHÓA: "${searchQuery}"]\n`;
          searchResults.slice(0, 4).forEach((r, idx) => {
            const shortSnippet =
              r.snippet.length > 300
                ? r.snippet.slice(0, 300) + "..."
                : r.snippet;
            contextStr += `Nguồn ${idx + 1}:\n- Tiêu đề: ${r.title}\n- Link: ${r.url}\n- Nội dung: ${shortSnippet}\n\n`;
          });
          contextStr += `YÊU CẦU XỬ LÝ:\n1. Phân tích và TỔNG HỢP toàn bộ dữ liệu trên thành một câu trả lời ngắn gọn, cô đọng, trực tiếp giải đáp câu hỏi của người dùng.\n2. Trình bày nội dung tự nhiên, rõ ràng, phân chia ý chính nếu cần. Tuyệt đối KHÔNG được chỉ liệt kê thô hay chép lại danh sách nguồn ở phần thân bài.\n3. Ở cuối câu trả lời, BẮT BUỘC liệt kê danh sách nguồn tham khảo theo định dạng:\n\n**📌 Nguồn tham khảo:**\n- [Tiêu đề trang 1](URL 1)\n- [Tiêu đề trang 2](URL 2)`;

          // Prune older history to stay well below Groq 6000 TPM limit
          if (llmMessages.length > 6) {
            const systemMsgs = llmMessages.filter((m) => m.role === "system");
            const recentMsgs = llmMessages
              .filter((m) => m.role !== "system")
              .slice(-4);
            llmMessages = [...systemMsgs, ...recentMsgs];
          }

          llmMessages.push({
            role: "system",
            content: contextStr,
          });
        } else {
          llmMessages.push({
            role: "system",
            content: `Không tìm thấy kết quả tìm kiếm trực tiếp cho từ khóa "${searchQuery}". Hãy trả lời dựa trên kiến thức hiện có và thành thật ghi nhận nếu thông tin chưa đầy đủ.`,
          });
        }
      }

      // Step 2: Stream completion
      const generator = this.groqLlmService.streamCompletion({
        model: modelName,
        messages: llmMessages,
        temperature: personality?.default_temperature || 0.7,
        max_tokens: personality?.default_max_output_tokens || 1024,
      });

      let actualModelUsed = modelName;
      for await (const chunk of generator) {
        if ((chunk as any).model) {
          actualModelUsed = (chunk as any).model;
        }
        if (chunk.delta) {
          fullAssistantResponse += chunk.delta;
          yield `event: message.delta\ndata: ${JSON.stringify({
            id: assistantMsg.id,
            delta: chunk.delta,
            model: actualModelUsed,
          })}\n\n`;
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      const latencyMs = Date.now() - startTime;

      // Update assistant message in DB
      const updatedAssistant = await this.prisma.message.update({
        where: { id: assistantMsg.id },
        data: {
          content: fullAssistantResponse,
          status: "completed",
          model: actualModelUsed,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          latency_ms: latencyMs,
        },
      });

      // Update conversation last_message_at
      const updatedConv = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { last_message_at: new Date() },
      });

      // Update usage event
      await this.prisma.usageEvent.update({
        where: { id: usageEvent.id },
        data: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          status_code: 200,
        },
      });

      this.metricsService.incrementLlmUsage(inputTokens, outputTokens);

      const usageInfo = await this.usageService.getUserUsage(user);

      // Emit completion events
      yield `event: message.completed\ndata: ${JSON.stringify({
        message: this.formatMessage(updatedAssistant),
      })}\n\n`;

      yield `event: usage.updated\ndata: ${JSON.stringify(usageInfo)}\n\n`;

      yield `event: conversation.updated\ndata: ${JSON.stringify({
        conversation: this.conversationsService.formatConversation(
          updatedConv,
        ),
      })}\n\n`;

      yield `event: done\ndata: {}\n\n`;
    } catch (err: any) {
      this.logger.error(`Error in chat stream: ${err.message}`, err.stack);
      this.metricsService.incrementFailedRequests();

      await this.prisma.message.update({
        where: { id: assistantMsg.id },
        data: {
          status: "failed",
          error_code: "LLM_ERROR",
        },
      });

      await this.prisma.usageEvent.update({
        where: { id: usageEvent.id },
        data: { status_code: 500 },
      });

      yield `event: message.failed\ndata: ${JSON.stringify({
        id: assistantMsg.id,
        error: err.message || "Streaming failed",
      })}\n\n`;

      yield `event: done\ndata: {}\n\n`;
    }
  }

  private formatMessage(msg: any) {
    const safeDate = (val: any) => {
      if (!val) return new Date().toISOString();
      if (typeof val === "string") return val;
      if (val instanceof Date) return val.toISOString();
      try {
        return new Date(val).toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content ?? "",
      status: msg.status ?? "completed",
      model: msg.model ?? null,
      input_tokens: msg.input_tokens ?? null,
      output_tokens: msg.output_tokens ?? null,
      latency_ms: msg.latency_ms ?? null,
      error_code: msg.error_code ?? null,
      parent_message_id: msg.parent_message_id ?? null,
      created_at: safeDate(msg.created_at),
      updated_at: safeDate(msg.updated_at),
    };
  }
}
