import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateConversationDto,
  UpdateConversationDto,
} from "./dto/conversations.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  formatConversation(conv: any) {
    return {
      id: conv.id,
      title: conv.title,
      personality_code: conv.personality_code,
      ai_nickname: conv.ai_nickname ?? null,
      summary: conv.summary,
      summary_version: conv.summary_version,
      last_message_at: conv.last_message_at.toISOString(),
      is_archived: conv.is_archived,
      created_at: conv.created_at.toISOString(),
      updated_at: conv.updated_at.toISOString(),
    };
  }

  async findUserConversations(user: User, includeArchived = false) {
    const where: any = { user_id: user.id };
    if (!includeArchived) {
      where.is_archived = false;
    }
    const items = await this.prisma.conversation.findMany({
      where,
      orderBy: { last_message_at: "desc" },
    });
    return {
      items: items.map((c) => this.formatConversation(c)),
      next_cursor: null,
    };
  }

  async create(user: User, dto: CreateConversationDto) {
    const personalityCode = dto.personality_code || "friendly";
    const personality = await this.prisma.personality.findUnique({
      where: { code: personalityCode },
    });
    if (!personality) {
      throw new BadRequestException(
        `Personality '${personalityCode}' not found`,
      );
    }

    let title = dto.title;
    if (!title) {
      if (dto.first_message && dto.first_message.trim()) {
        const text = dto.first_message.trim();
        title = text.length > 30 ? text.substring(0, 30) + "..." : text;
      } else {
        title = "Cuộc trò chuyện mới";
      }
    }

    const conv = await this.prisma.conversation.create({
      data: {
        user_id: user.id,
        personality_code: personalityCode,
        title,
        ai_nickname: dto.ai_nickname?.trim() || null,
      },
    });

    return this.formatConversation(conv);
  }

  async getOwnedConversation(user: User, id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conv || conv.user_id !== user.id) {
      throw new NotFoundException("Conversation not found");
    }
    return conv;
  }

  async findOne(user: User, id: string) {
    const conv = await this.getOwnedConversation(user, id);
    return this.formatConversation(conv);
  }

  async update(user: User, id: string, dto: UpdateConversationDto) {
    await this.getOwnedConversation(user, id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.ai_nickname !== undefined) {
      data.ai_nickname = dto.ai_nickname.trim() || null;
    }
    if (dto.personality_code !== undefined) {
      const p = await this.prisma.personality.findUnique({
        where: { code: dto.personality_code },
      });
      if (!p) {
        throw new BadRequestException(
          `Personality '${dto.personality_code}' not found`,
        );
      }
      data.personality_code = dto.personality_code;
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data,
    });
    return this.formatConversation(updated);
  }

  async setArchiveStatus(user: User, id: string, isArchived: boolean) {
    await this.getOwnedConversation(user, id);
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { is_archived: isArchived },
    });
    return this.formatConversation(updated);
  }

  async remove(user: User, id: string) {
    await this.getOwnedConversation(user, id);
    await this.prisma.conversation.delete({
      where: { id },
    });
  }
}
