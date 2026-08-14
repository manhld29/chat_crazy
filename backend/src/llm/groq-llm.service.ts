import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { LLMRequest, LLMUsage } from "./llm.types";

@Injectable()
export class GroqLlmService {
  private readonly logger = new Logger(GroqLlmService.name);

  constructor(private readonly configService: ConfigService) {}

  async createCompletion(req: LLMRequest): Promise<any> {
    const apiKey = this.configService.get<string>("groqApiKey");
    const baseUrl = this.configService.get<string>(
      "groqBaseUrl",
      "https://api.groq.com/openai/v1",
    );

    if (!apiKey) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: `Mock mode completion for: ${req.messages[req.messages.length - 1]?.content || ""}`,
            },
          },
        ],
      };
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const url = new URL(endpoint);

    const bodyObj: any = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 1024,
      stream: false,
    };

    if (req.tools && req.tools.length > 0) {
      bodyObj.tools = req.tools;
      if (req.tool_choice) bodyObj.tool_choice = req.tool_choice;
    }

    const requestBody = JSON.stringify(bodyObj);

    const isHttps = url.protocol === "https:";
    const httpLib = isHttps ? https : http;

    const requestOptions = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const res: http.IncomingMessage = await new Promise((resolve, reject) => {
      const clientReq = httpLib.request(requestOptions, (res) => resolve(res));
      clientReq.on("error", (err) => reject(err));
      clientReq.write(requestBody);
      clientReq.end();
    });

    let resText = "";
    for await (const chunk of res) {
      resText += chunk.toString();
    }

    if (res.statusCode && res.statusCode >= 400) {
      throw new Error(
        `Groq LLM API returned status ${res.statusCode}: ${resText}`,
      );
    }

    return JSON.parse(resText);
  }

  async *streamCompletion(
    req: LLMRequest,
  ): AsyncGenerator<{ delta: string; usage?: LLMUsage }, void, unknown> {
    const apiKey = this.configService.get<string>("groqApiKey");
    const baseUrl = this.configService.get<string>(
      "groqBaseUrl",
      "https://api.groq.com/openai/v1",
    );

    if (!apiKey) {
      // Mock mode if no API key is provided
      this.logger.warn(
        "GROQ_API_KEY is not configured. Falling back to mock LLM responses.",
      );
      const mockText = `Đây là câu trả lời thử nghiệm từ hệ thống chatbot (Mock Mode). Bạn vừa nhắn: "${req.messages[req.messages.length - 1]?.content || ""}".`;
      const words = mockText.split(" ");
      for (const word of words) {
        await new Promise((r) => setTimeout(r, 40));
        yield { delta: word + " " };
      }
      yield {
        delta: "",
        usage: {
          prompt_tokens: 15,
          completion_tokens: words.length * 2,
          total_tokens: 15 + words.length * 2,
        },
      };
      return;
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const url = new URL(endpoint);

    const bodyObj: any = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 1024,
      stream: true,
    };

    if (req.tools && req.tools.length > 0) {
      bodyObj.tools = req.tools;
      if (req.tool_choice) bodyObj.tool_choice = req.tool_choice;
    }

    const requestBody = JSON.stringify(bodyObj);

    const isHttps = url.protocol === "https:";
    const httpLib = isHttps ? https : http;

    const requestOptions = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const res: http.IncomingMessage = await new Promise((resolve, reject) => {
      const clientReq = httpLib.request(requestOptions, (res) => resolve(res));
      clientReq.on("error", (err) => reject(err));
      clientReq.write(requestBody);
      clientReq.end();
    });

    if (res.statusCode && res.statusCode >= 400) {
      let errBody = "";
      for await (const chunk of res) {
        errBody += chunk.toString();
      }
      throw new Error(
        `Groq LLM API returned status ${res.statusCode}: ${errBody}`,
      );
    }

    let buffer = "";
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for await (const chunk of res) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (trimmed === "data: [DONE]") break;

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              totalCompletionTokens += 1;
              yield { delta };
            }
            if (parsed.usage) {
              totalPromptTokens =
                parsed.usage.prompt_tokens || totalPromptTokens;
              totalCompletionTokens =
                parsed.usage.completion_tokens || totalCompletionTokens;
            }
          } catch {
            // Ignore parse errors for broken chunk lines
          }
        }
      }
    }

    if (
      buffer.trim().startsWith("data: ") &&
      buffer.trim() !== "data: [DONE]"
    ) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        const delta = parsed.choices?.[0]?.delta?.content || "";
        if (delta) yield { delta };
      } catch {
        // ignore
      }
    }

    yield {
      delta: "",
      usage: {
        prompt_tokens: totalPromptTokens || 20,
        completion_tokens: totalCompletionTokens || 20,
        total_tokens: (totalPromptTokens || 20) + (totalCompletionTokens || 20),
      },
    };
  }
}
