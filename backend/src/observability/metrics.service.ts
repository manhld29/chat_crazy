import { Injectable } from "@nestjs/common";

@Injectable()
export class MetricsService {
  private requestsTotal = 0;
  private requestsFailed = 0;
  private llmRequestsTotal = 0;
  private llmTokensInput = 0;
  private llmTokensOutput = 0;

  incrementRequests() {
    this.requestsTotal++;
  }

  incrementFailedRequests() {
    this.requestsFailed++;
  }

  incrementLlmUsage(inputTokens: number, outputTokens: number) {
    this.llmRequestsTotal++;
    this.llmTokensInput += inputTokens;
    this.llmTokensOutput += outputTokens;
  }

  getSnapshot() {
    return {
      requests_total: this.requestsTotal,
      requests_failed: this.requestsFailed,
      llm_requests_total: this.llmRequestsTotal,
      llm_tokens_input_total: this.llmTokensInput,
      llm_tokens_output_total: this.llmTokensOutput,
    };
  }
}
