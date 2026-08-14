export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface LLMToolFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMTool {
  type: "function";
  function: LLMToolFunction;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: LLMTool[];
  tool_choice?: string | object;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
