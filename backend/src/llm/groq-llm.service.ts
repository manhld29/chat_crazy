import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { LLMRequest, LLMUsage } from "./llm.types";

export const OPENROUTER_FREE_MODELS = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B Instruct (Free)",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google Gemini 2.0 Flash (Free)",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Reasoning (Free)",
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3 (Free)",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B (Free)",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct (Free)",
  },
] as const;

@Injectable()
export class GroqLlmService {
  private readonly logger = new Logger(GroqLlmService.name);

  constructor(private readonly configService: ConfigService) {}

  private getProviderConfig(targetModel: string) {
    const isOpenRouterModel =
      targetModel.includes("/") ||
      targetModel.endsWith(":free") ||
      targetModel.startsWith("openrouter/");

    const openrouterApiKey = this.configService.get<string>("openrouterApiKey");
    const openrouterBaseUrl = this.configService.get<string>(
      "openrouterBaseUrl",
      "https://openrouter.ai/api/v1",
    );
    const groqApiKey = this.configService.get<string>("groqApiKey");
    const groqBaseUrl = this.configService.get<string>(
      "groqBaseUrl",
      "https://api.groq.com/openai/v1",
    );

    if (isOpenRouterModel) {
      const apiKey = openrouterApiKey || groqApiKey || "";
      const baseUrl = openrouterApiKey
        ? openrouterBaseUrl
        : groqApiKey
        ? groqBaseUrl
        : openrouterBaseUrl;
      return {
        apiKey,
        baseUrl,
        model: targetModel,
        extraHeaders: {
          "HTTP-Referer": "https://chatcrazy.vercel.app",
          "X-Title": "ChatCrazy AI",
        },
      };
    }

    if (!groqApiKey && openrouterApiKey) {
      return {
        apiKey: openrouterApiKey,
        baseUrl: openrouterBaseUrl,
        model: "meta-llama/llama-3.3-70b-instruct:free",
        extraHeaders: {
          "HTTP-Referer": "https://chatcrazy.vercel.app",
          "X-Title": "ChatCrazy AI",
        },
      };
    }

    return {
      apiKey: groqApiKey || "",
      baseUrl: groqBaseUrl,
      model: targetModel,
      extraHeaders: {},
    };
  }

  async createCompletion(req: LLMRequest): Promise<any> {
    const provider = this.getProviderConfig(req.model);
    const apiKey = provider.apiKey;
    const baseUrl = provider.baseUrl;

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
      model: provider.model,
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

    const maxRetries = 3;
    let res: http.IncomingMessage | null = null;
    let resText = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          ...provider.extraHeaders,
        },
      };

      res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const clientReq = httpLib.request(requestOptions, (r) => resolve(r));
        clientReq.on("error", (err) => reject(err));
        clientReq.write(requestBody);
        clientReq.end();
      });

      if (res.statusCode === 429 && attempt < maxRetries) {
        let errBody = "";
        for await (const chunk of res) {
          errBody += chunk.toString();
        }
        this.logger.warn(
          `LLM API 429 Rate limit hit in createCompletion (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${600 * (attempt + 1)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }

      resText = "";
      for await (const chunk of res) {
        resText += chunk.toString();
      }

      if (res.statusCode && res.statusCode >= 400) {
        throw new Error(
          `LLM API returned status ${res.statusCode}: ${resText}`,
        );
      }

      return JSON.parse(resText);
    }

    throw new Error(`LLM API failed after ${maxRetries} retries.`);
  }

  async *streamCompletion(
    req: LLMRequest,
  ): AsyncGenerator<{ delta: string; usage?: LLMUsage }, void, unknown> {
    const provider = this.getProviderConfig(req.model);
    const apiKey = provider.apiKey;
    const baseUrl = provider.baseUrl;

    if (!apiKey) {
      // Mock mode if no API key is provided
      this.logger.warn(
        "LLM API Key is not configured. Falling back to mock LLM responses.",
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
      model: provider.model,
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

    const maxRetries = 3;
    let res: http.IncomingMessage | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          ...provider.extraHeaders,
        },
      };

      res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const clientReq = httpLib.request(requestOptions, (response) =>
          resolve(response),
        );
        clientReq.on("error", (err) => reject(err));
        clientReq.write(requestBody);
        clientReq.end();
      });

      if (res.statusCode === 429 && attempt < maxRetries) {
        let errBody = "";
        for await (const chunk of res) {
          errBody += chunk.toString();
        }
        this.logger.warn(
          `LLM API 429 Rate limit hit in streamCompletion (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${600 * (attempt + 1)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }

      break;
    }

    if (!res || (res.statusCode && res.statusCode >= 400)) {
      let errBody = "";
      if (res) {
        for await (const chunk of res) {
          errBody += chunk.toString();
        }
      }
      throw new Error(
        `LLM API returned status ${res?.statusCode || 500}: ${errBody}`,
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
