import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { OPENROUTER_FREE_MODELS } from "../llm/groq-llm.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AdminLoginDto, UpdateModelConfigDto, UpdateUserLimitDto } from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async adminLogin(dto: AdminLoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await this.authService.verifyPassword(
      dto.password,
      user.password_hash,
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    return this.authService.createTokens(user, userAgent, ipAddress);
  }

  async getModelConfig(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    const modeSetting = await this.prisma.systemSetting.findUnique({
      where: { key: "manual_model_mode" },
    });
    const modelSetting = await this.prisma.systemSetting.findUnique({
      where: { key: "manual_model_name" },
    });

    const manualMode = modeSetting?.value === "true";
    const selectedModel =
      modelSetting?.value || "meta-llama/llama-3.3-70b-instruct:free";

    return {
      manual_mode: manualMode,
      selected_model: selectedModel,
      active_model: manualMode
        ? selectedModel
        : "openrouter/free (Tự động lựa chọn model free)",
      available_models: OPENROUTER_FREE_MODELS,
    };
  }

  async updateModelConfig(user: User, dto: UpdateModelConfigDto) {
    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    await this.prisma.systemSetting.upsert({
      where: { key: "manual_model_mode" },
      update: { value: dto.manual_mode ? "true" : "false" },
      create: {
        key: "manual_model_mode",
        value: dto.manual_mode ? "true" : "false",
      },
    });

    if (dto.selected_model) {
      await this.prisma.systemSetting.upsert({
        where: { key: "manual_model_name" },
        update: { value: dto.selected_model },
        create: { key: "manual_model_name", value: dto.selected_model },
      });
    }

    return this.getModelConfig(user);
  }

  getAdminConfig(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }
    return {
      app_env: this.configService.get("appEnv", "development"),
      app_name: this.configService.get("appName", "Funny Chatbot API"),
      app_version: this.configService.get("appVersion", "0.1.0"),
      default_llm_model: this.configService.get("defaultLlmModel"),
      cheap_llm_model: this.configService.get("cheapLlmModel"),
      fallback_llm_model: this.configService.get("fallbackLlmModel"),
      groq_configured: !!this.configService.get("groqApiKey"),
      redis_configured: this.redisService.isConfigured(),
      metrics_enabled: this.configService.get<boolean>("metricsEnabled", true),
      context_token_budget: this.configService.get<number>(
        "contextTokenBudget",
        4096,
      ),
      conversation_window_messages: this.configService.get<number>(
        "conversationWindowMessages",
        20,
      ),
      rate_limit_per_minute: this.configService.get<number>(
        "rateLimitPerMinute",
        60,
      ),
    };
  }

  async getAdminDashboard(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
      ),
    );

    const totalUsers = await this.prisma.user.count();
    const guestUsers = await this.prisma.user.count({
      where: { is_guest: true },
    });
    const registeredUsers = totalUsers - guestUsers;
    const activeUsers = await this.prisma.user.count({
      where: { is_active: true },
    });
    const conversations = await this.prisma.conversation.count();

    const eventsToday = await this.prisma.usageEvent.findMany({
      where: { created_at: { gte: startOfDay } },
    });

    const messagesToday = eventsToday.filter(
      (e) => e.event_type === "chat_completion" && e.status_code === 200,
    ).length;
    const inputTokensToday = eventsToday.reduce(
      (acc, e) => acc + (e.input_tokens || 0),
      0,
    );
    const outputTokensToday = eventsToday.reduce(
      (acc, e) => acc + (e.output_tokens || 0),
      0,
    );
    const failedRequestsToday = eventsToday.filter(
      (e) => e.status_code >= 400,
    ).length;

    return {
      total_users: totalUsers,
      guest_users: guestUsers,
      registered_users: registeredUsers,
      active_users: activeUsers,
      conversations,
      messages_today: messagesToday,
      input_tokens_today: inputTokensToday,
      output_tokens_today: outputTokensToday,
      failed_requests_today: failedRequestsToday,
    };
  }

  async getAdminAccounts(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
      ),
    );

    const users = await this.prisma.user.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: { conversations: true },
        },
        usage_events: {
          where: { created_at: { gte: startOfDay } },
        },
      },
    });

    const items = users.map((u) => {
      const messagesToday = u.usage_events.filter(
        (e) => e.event_type === "chat_completion" && e.status_code === 200,
      ).length;
      const inputTokensToday = u.usage_events.reduce(
        (acc, e) => acc + (e.input_tokens || 0),
        0,
      );
      const outputTokensToday = u.usage_events.reduce(
        (acc, e) => acc + (e.output_tokens || 0),
        0,
      );

      return {
        user_id: u.id,
        email: u.email,
        display_name: u.display_name || "Người dùng",
        is_guest: u.is_guest,
        is_active: u.is_active,
        daily_message_limit: u.daily_message_limit,
        conversations: u._count.conversations,
        messages_today: messagesToday,
        input_tokens_today: inputTokensToday,
        output_tokens_today: outputTokensToday,
        last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
        created_at: u.created_at.toISOString(),
      };
    });

    return { items };
  }

  async updateUserLimit(
    currentUser: User,
    targetUserId: string,
    dto: UpdateUserLimitDto,
  ) {
    if (!currentUser.is_admin) {
      throw new ForbiddenException("Admin access required");
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { daily_message_limit: dto.daily_message_limit ?? null },
    });

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
      ),
    );

    const eventsToday = await this.prisma.usageEvent.findMany({
      where: { user_id: updated.id, created_at: { gte: startOfDay } },
    });
    const conversationsCount = await this.prisma.conversation.count({
      where: { user_id: updated.id },
    });

    const messagesToday = eventsToday.filter(
      (e) => e.event_type === "chat_completion" && e.status_code === 200,
    ).length;
    const inputTokensToday = eventsToday.reduce(
      (acc, e) => acc + (e.input_tokens || 0),
      0,
    );
    const outputTokensToday = eventsToday.reduce(
      (acc, e) => acc + (e.output_tokens || 0),
      0,
    );

    return {
      user_id: updated.id,
      email: updated.email,
      display_name: updated.display_name || "Người dùng",
      is_guest: updated.is_guest,
      is_active: updated.is_active,
      daily_message_limit: updated.daily_message_limit,
      conversations: conversationsCount,
      messages_today: messagesToday,
      input_tokens_today: inputTokensToday,
      output_tokens_today: outputTokensToday,
      last_login_at: updated.last_login_at
        ? updated.last_login_at.toISOString()
        : null,
      created_at: updated.created_at.toISOString(),
    };
  }
}
