import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { PrismaService } from "../prisma/prisma.service";
import { LLMRequest, LLMUsage } from "./llm.types";

export const DEFAULT_FREE_MODEL_POOL = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "nvidia/nemotron-3.5-lightning:free",
  "openai/gpt-oss-20b:free",
  "cohere/north-mini-code:free",
  "liquid/lfm-2.5-2.6b:free",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
] as const;

export const OPENROUTER_FREE_MODELS = [
  {
    id: "openrouter/free",
    name: "OpenRouter Auto Free Router",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B Instruct (Free)",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google Gemini 2.0 Flash (Free)",
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3 (Free)",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Reasoning (Free)",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B (Free)",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Google Gemma 4 26B (Free)",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B (Free)",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct (Free)",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5 Lightning (Free)",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI GPT OSS 20B (Free)",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code (Free)",
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "LiquidAI LFM 2.5 2.6B (Free)",
  },
] as const;

@Injectable()
export class GroqLlmService {
  private readonly logger = new Logger(GroqLlmService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveActiveCandidateModels(
    requestedModel: string,
  ): Promise<string[]> {
    try {
      const modeSetting = await this.prisma.systemSetting.findUnique({
        where: { key: "manual_model_mode" },
      });
      const modelSetting = await this.prisma.systemSetting.findUnique({
        where: { key: "manual_model_name" },
      });

      const isManualMode = modeSetting?.value === "true";
      const manualModel = modelSetting?.value;

      if (isManualMode && manualModel) {
        this.logger.log(
          `[Manual Model Setting Active] Forcing primary model: ${manualModel}`,
        );
        return [
          manualModel,
          ...DEFAULT_FREE_MODEL_POOL.filter((m) => m !== manualModel),
        ];
      }
    } catch (err: any) {
      this.logger.debug(
        `Could not read system_settings from DB: ${err.message}`,
      );
    }

    return [
      requestedModel,
      ...DEFAULT_FREE_MODEL_POOL.filter((m) => m !== requestedModel),
    ];
  }

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
    const candidateModels = await this.resolveActiveCandidateModels(req.model);

    let lastError: Error | null = null;

    for (const candidateModel of candidateModels) {
      const provider = this.getProviderConfig(candidateModel);
      if (!provider.apiKey) {
        continue;
      }

      try {
        const res = await this.executeSingleCompletionAttempt({
          ...req,
          model: candidateModel,
        });
        if (res && res.choices && res.choices.length > 0) {
          return res;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Free model '${candidateModel}' failed in createCompletion: ${err.message}. Auto-switching to next model in pool...`,
        );
      }
    }

    // Mock fallback if all providers fail
    this.logger.warn(
      `All free models failed in createCompletion: ${lastError?.message}. Returning mock completion.`,
    );
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

  private async executeSingleCompletionAttempt(req: LLMRequest): Promise<any> {
    const provider = this.getProviderConfig(req.model);
    const apiKey = provider.apiKey;
    const baseUrl = provider.baseUrl;

    if (!apiKey) {
      throw new Error(`No API key configured for provider of ${req.model}`);
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

    const maxRetries = 1;
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
          `LLM API 429 Rate limit hit in ${req.model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in 500ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
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

    throw new Error(`LLM API request for ${req.model} failed.`);
  }

  async *streamCompletion(
    req: LLMRequest,
  ): AsyncGenerator<
    { delta: string; model?: string; usage?: LLMUsage },
    void,
    unknown
  > {
    const candidateModels = await this.resolveActiveCandidateModels(req.model);

    let lastError: Error | null = null;
    let streamSucceeded = false;

    for (const candidateModel of candidateModels) {
      const provider = this.getProviderConfig(candidateModel);
      if (!provider.apiKey) {
        continue;
      }

      try {
        const streamGenerator = this.executeSingleStreamAttempt({
          ...req,
          model: candidateModel,
        });

        let hasYieldedAnyChunk = false;
        for await (const chunk of streamGenerator) {
          hasYieldedAnyChunk = true;
          yield {
            ...chunk,
            model: candidateModel,
          };
        }

        if (hasYieldedAnyChunk) {
          streamSucceeded = true;
          return;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Free model '${candidateModel}' failed: ${err.message}. Auto-switching to next model in pool...`,
        );
      }
    }

    if (streamSucceeded) return;

    // Fallback to mock mode if all API keys or models fail
    this.logger.warn(
      `All free models in pool failed. Error: ${lastError?.message}. Falling back to mock LLM response.`,
    );
    const mockText = `Đây là câu trả lời thử nghiệm từ hệ thống chatbot (Mock Mode). Bạn vừa nhắn: "${req.messages[req.messages.length - 1]?.content || ""}".`;
    const words = mockText.split(" ");
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 40));
      yield { delta: word + " " };
    }
    yield {
      delta: "",
      model: "mock-mode",
      usage: {
        prompt_tokens: 15,
        completion_tokens: words.length * 2,
        total_tokens: 15 + words.length * 2,
      },
    };
  }

  private async *executeSingleStreamAttempt(
    req: LLMRequest,
  ): AsyncGenerator<{ delta: string; usage?: LLMUsage }, void, unknown> {
    const provider = this.getProviderConfig(req.model);
    const apiKey = provider.apiKey;
    const baseUrl = provider.baseUrl;

    if (!apiKey) {
      throw new Error(`No API key configured for provider of ${req.model}`);
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

    const maxRetries = 1;
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
          `LLM API 429 Rate limit hit in ${req.model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in 500ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
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
