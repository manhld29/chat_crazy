import { getApiBaseUrl } from "@/lib/config";

export type UserPublic = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string;
  is_guest: boolean;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserPublic;
};

export type HealthResponse = {
  status: string;
  app_name: string;
  version: string;
  environment: string;
};

export type Personality = {
  id: string;
  code: string;
  name: string;
  description: string;
  default_temperature: number;
  default_max_output_tokens: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  personality_code: string;
  summary: string | null;
  summary_version: number;
  last_message_at: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ConversationListResponse = {
  items: Conversation[];
  next_cursor: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status: "pending" | "streaming" | "completed" | "failed" | "cancelled";
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  error_code: string | null;
  parent_message_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageListResponse = {
  items: Message[];
  next_cursor: string | null;
};

export type MemoryCategory =
  | "addressing"
  | "communication_style"
  | "interest"
  | "user_requested"
  | "inside_joke"
  | "other";

export type Memory = {
  id: string;
  memory_key: string;
  memory_value: string;
  category: MemoryCategory;
  confidence: number;
  source_message_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UsageMeResponse = {
  plan: string;
  messages_used_today: number;
  messages_remaining_today: number;
  input_tokens_today: number;
  output_tokens_today: number;
  failed_requests_today: number;
  usage_by_model: Record<string, number>;
  reset_at: string;
};

export type AdminConfigResponse = {
  app_env: string;
  app_name: string;
  app_version: string;
  default_llm_model: string | null;
  cheap_llm_model: string | null;
  fallback_llm_model: string | null;
  groq_configured: boolean;
  redis_configured: boolean;
  metrics_enabled: boolean;
  context_token_budget: number;
  conversation_window_messages: number;
  rate_limit_per_minute: number;
};

export type AdminDashboardResponse = {
  total_users: number;
  guest_users: number;
  registered_users: number;
  active_users: number;
  conversations: number;
  messages_today: number;
  input_tokens_today: number;
  output_tokens_today: number;
  failed_requests_today: number;
};

export type AdminAccountUsage = {
  user_id: string;
  email: string | null;
  display_name: string;
  is_guest: boolean;
  is_active: boolean;
  daily_message_limit: number | null;
  conversations: number;
  messages_today: number;
  input_tokens_today: number;
  output_tokens_today: number;
  last_login_at: string | null;
  created_at: string;
};

export type AdminAccountsResponse = {
  items: AdminAccountUsage[];
};

export type ChatStreamEvent =
  | "message.created"
  | "message.delta"
  | "message.completed"
  | "message.failed"
  | "usage.updated"
  | "conversation.updated"
  | "done";

export type ChatStreamPayload = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type RequestOptions = {
  token?: string | null;
  method?: string;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      }
    } catch {
      // Keep generic message.
    }
    throw new ApiError(`${message} (${path})`, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function streamRequest(
  path: string,
  options: RequestOptions,
  onEvent: (event: ChatStreamEvent, data: ChatStreamPayload) => void,
): Promise<void> {
  const headers: HeadersInit = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "POST",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      }
    } catch {
      // Keep generic message.
    }
    throw new ApiError(message, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const parsed = parseSseBlock(block);
      if (parsed) {
        onEvent(parsed.event, parsed.data);
      }
    }
  }
  if (buffer.trim()) {
    const parsed = parseSseBlock(buffer);
    if (parsed) {
      onEvent(parsed.event, parsed.data);
    }
  }
}

function parseSseBlock(block: string): { event: ChatStreamEvent; data: ChatStreamPayload } | null {
  let event: ChatStreamEvent | null = null;
  let data = "{}";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) {
      event = line.slice("event: ".length) as ChatStreamEvent;
    }
    if (line.startsWith("data: ")) {
      data = line.slice("data: ".length);
    }
  }
  if (!event) {
    return null;
  }
  return { event, data: JSON.parse(data) as ChatStreamPayload };
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  ready: () => request<{ status: string }>("/ready"),
  register: (body: { email: string; password: string; display_name: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body }),
  guest: (displayName: string) =>
    request<TokenResponse>("/auth/guest", {
      method: "POST",
      body: { display_name: displayName },
    }),
  logout: (token: string, refreshToken: string | null) =>
    request<{ message: string }>("/auth/logout", {
      token,
      method: "POST",
      body: { refresh_token: refreshToken },
    }),
  me: (token: string) => request<UserPublic>("/users/me", { token }),
  updateMe: (token: string, displayName: string) =>
    request<UserPublic>("/users/me", {
      token,
      method: "PATCH",
      body: { display_name: displayName },
    }),
  upgradeGuest: (
    token: string,
    body: { email: string; password: string; display_name: string },
  ) => request<TokenResponse>("/auth/upgrade-guest", { token, method: "POST", body }),
  forgotPassword: (body: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body: { token: string; new_password: string }) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body }),
  personalities: () => request<Personality[]>("/personalities"),
  conversations: (token: string, includeArchived = false) =>
    request<ConversationListResponse>(
      `/conversations?include_archived=${includeArchived ? "true" : "false"}`,
      { token },
    ),
  createConversation: (
    token: string,
    body: { title?: string; first_message?: string; personality_code?: string },
  ) => request<Conversation>("/conversations", { token, method: "POST", body }),
  updateConversation: (
    token: string,
    id: string,
    body: { title?: string; personality_code?: string },
  ) => request<Conversation>(`/conversations/${id}`, { token, method: "PATCH", body }),
  archiveConversation: (token: string, id: string) =>
    request<Conversation>(`/conversations/${id}/archive`, { token, method: "POST" }),
  unarchiveConversation: (token: string, id: string) =>
    request<Conversation>(`/conversations/${id}/unarchive`, { token, method: "POST" }),
  deleteConversation: (token: string, id: string) =>
    request<void>(`/conversations/${id}`, { token, method: "DELETE" }),
  messages: (token: string, conversationId: string) =>
    request<MessageListResponse>(`/conversations/${conversationId}/messages`, { token }),
  streamMessage: (
    token: string,
    conversationId: string,
    body: { content: string; client_message_id: string; retry_from_message_id?: string | null },
    onEvent: (event: ChatStreamEvent, data: ChatStreamPayload) => void,
  ) =>
    streamRequest(
      `/conversations/${conversationId}/messages/stream`,
      { token, method: "POST", body },
      onEvent,
    ),
  memories: (token: string) => request<{ items: Memory[] }>("/memories", { token }),
  createMemory: (
    token: string,
    body: { memory_key: string; memory_value: string; category: MemoryCategory },
  ) => request<Memory>("/memories", { token, method: "POST", body }),
  deleteMemory: (token: string, id: string) =>
    request<void>(`/memories/${id}`, { token, method: "DELETE" }),
  deleteAllMemories: (token: string) => request<void>("/memories", { token, method: "DELETE" }),
  usage: (token: string) => request<UsageMeResponse>("/usage/me", { token }),
  adminLogin: (body: { identifier: string; password: string }) =>
    request<TokenResponse>("/admin/login", { method: "POST", body }),
  adminConfig: (token: string) => request<AdminConfigResponse>("/admin/config", { token }),
  adminDashboard: (token: string) => request<AdminDashboardResponse>("/admin/dashboard", { token }),
  adminAccounts: (token: string) => request<AdminAccountsResponse>("/admin/accounts", { token }),
  updateAdminUserLimit: (token: string, userId: string, dailyMessageLimit: number | null) =>
    request<AdminAccountUsage>(`/admin/users/${userId}/limits`, {
      token,
      method: "PATCH",
      body: { daily_message_limit: dailyMessageLimit },
    }),
};
