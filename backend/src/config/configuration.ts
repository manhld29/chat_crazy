export default () => ({
  appEnv: process.env.APP_ENV || "development",
  appName: process.env.APP_NAME || "Funny Chatbot API",
  appVersion: process.env.APP_VERSION || "0.1.0",
  apiV1Prefix: process.env.API_V1_PREFIX || "/api/v1",
  port: parseInt(process.env.PORT || "8000", 10),

  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://chat_crazy:chat_crazy@localhost:5432/chat_crazy",

  groqApiKey: process.env.GROQ_API_KEY || "",
  groqBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  defaultLlmModel: process.env.DEFAULT_LLM_MODEL || "llama-3.3-70b-versatile",
  cheapLlmModel: process.env.CHEAP_LLM_MODEL || "llama-3.1-8b-instant",
  fallbackLlmModel: process.env.FALLBACK_LLM_MODEL || "llama-3.1-8b-instant",
  llmTimeoutSeconds: parseInt(process.env.LLM_TIMEOUT_SECONDS || "30", 10),
  llmMaxRetries: parseInt(process.env.LLM_MAX_RETRIES || "1", 10),
  llmMaxOutputTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || "1024", 10),

  jwtSecretKey:
    process.env.JWT_SECRET_KEY || "development-only-change-me-32-bytes",
  jwtAlgorithm: process.env.JWT_ALGORITHM || "HS256",
  accessTokenExpireMinutes: parseInt(
    process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "30",
    10,
  ),
  refreshTokenExpireDays: parseInt(
    process.env.REFRESH_TOKEN_EXPIRE_DAYS || "30",
    10,
  ),
  refreshTokenCookieName:
    process.env.REFRESH_TOKEN_COOKIE_NAME || "chat_crazy_refresh",
  refreshTokenCookieSameSite:
    process.env.REFRESH_TOKEN_COOKIE_SAMESITE || "lax",
  refreshTokenCookieSecure: process.env.REFRESH_TOKEN_COOKIE_SECURE === "true",

  frontendOrigins: (
    process.env.FRONTEND_ORIGINS || "http://localhost:3000"
  ).split(","),
  logLevel: process.env.LOG_LEVEL || "INFO",
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  metricsEnabled: process.env.METRICS_ENABLED !== "false",
  metricsToken: process.env.METRICS_TOKEN || "",
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || "60", 10),
  maxInputTokens: parseInt(process.env.MAX_INPUT_TOKENS || "4096", 10),
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || "1024", 10),
  conversationWindowMessages: parseInt(
    process.env.CONVERSATION_WINDOW_MESSAGES || "20",
    10,
  ),
  contextTokenBudget: parseInt(process.env.CONTEXT_TOKEN_BUDGET || "4096", 10),
  summaryMessageThreshold: parseInt(
    process.env.SUMMARY_MESSAGE_THRESHOLD || "40",
    10,
  ),
  summaryTokenThreshold: parseInt(
    process.env.SUMMARY_TOKEN_THRESHOLD || "3000",
    10,
  ),
});
