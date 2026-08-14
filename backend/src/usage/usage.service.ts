import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserUsage(user: User) {
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
    const nextReset = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      ),
    );

    const eventsToday = await this.prisma.usageEvent.findMany({
      where: {
        user_id: user.id,
        created_at: { gte: startOfDay },
      },
    });

    const messagesUsedToday = eventsToday.filter(
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

    const usageByModel: Record<string, number> = {};
    for (const e of eventsToday) {
      if (e.model) {
        usageByModel[e.model] = (usageByModel[e.model] || 0) + 1;
      }
    }

    const limit = user.daily_message_limit ?? 100;
    const remaining = Math.max(0, limit - messagesUsedToday);

    return {
      plan: user.is_guest ? "guest" : user.is_admin ? "admin" : "free",
      messages_used_today: messagesUsedToday,
      messages_remaining_today: remaining,
      input_tokens_today: inputTokensToday,
      output_tokens_today: outputTokensToday,
      failed_requests_today: failedRequestsToday,
      usage_by_model: usageByModel,
      reset_at: nextReset.toISOString(),
    };
  }

  async checkUserCanSendMessage(user: User) {
    const usage = await this.getUserUsage(user);
    if (usage.messages_remaining_today <= 0) {
      return false;
    }
    return true;
  }
}
