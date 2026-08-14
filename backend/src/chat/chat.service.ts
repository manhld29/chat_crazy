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
import { LLMMessage } from "../llm/llm.types";
import { ContextBuilderService } from "../memory/context-builder.service";
import { MetricsService } from "../observability/metrics.service";
import { PrismaService } from "../prisma/prisma.service";
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

    const llmMessages: LLMMessage[] = [
      { role: "system", content: fullSystemPrompt },
      ...pastMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user", content: dto.content },
    ];

    let fullAssistantResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const startTime = Date.now();

    try {
      const generator = this.groqLlmService.streamCompletion({
        model: modelName,
        messages: llmMessages,
        temperature: personality?.default_temperature || 0.7,
        max_tokens: personality?.default_max_output_tokens || 1024,
      });

      for await (const chunk of generator) {
        if (chunk.delta) {
          fullAssistantResponse += chunk.delta;
          yield `event: message.delta\ndata: ${JSON.stringify({
            id: assistantMsg.id,
            delta: chunk.delta,
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
          model: modelName,
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
        conversation: this.conversationsService.formatConversation(updatedConv),
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
