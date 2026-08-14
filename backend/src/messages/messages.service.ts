import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { ConversationsService } from "../conversations/conversations.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
  ) {}

  formatMessage(msg: any) {
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

  async findConversationMessages(user: User, conversationId: string) {
    await this.conversationsService.getOwnedConversation(user, conversationId);

    const items = await this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: "asc" },
    });

    return {
      items: items.map((m) => this.formatMessage(m)),
      next_cursor: null,
    };
  }
}
