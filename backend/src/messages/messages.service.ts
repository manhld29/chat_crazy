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
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      status: msg.status,
      model: msg.model,
      input_tokens: msg.input_tokens,
      output_tokens: msg.output_tokens,
      latency_ms: msg.latency_ms,
      error_code: msg.error_code,
      parent_message_id: msg.parent_message_id,
      created_at: msg.created_at.toISOString(),
      updated_at: msg.updated_at.toISOString(),
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
