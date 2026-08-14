import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertFeedbackDto } from "./dto/upsert-feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  formatFeedback(f: any) {
    return {
      id: f.id,
      message_id: f.message_id,
      user_id: f.user_id,
      rating: f.rating,
      comment: f.comment,
      created_at: f.created_at.toISOString(),
      updated_at: f.updated_at.toISOString(),
    };
  }

  async upsert(user: User, messageId: string, dto: UpsertFeedbackDto) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg || msg.user_id !== user.id) {
      throw new NotFoundException("Message not found");
    }

    const fb = await this.prisma.feedback.upsert({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: user.id,
        },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment || null,
      },
      create: {
        message_id: messageId,
        user_id: user.id,
        rating: dto.rating,
        comment: dto.comment || null,
      },
    });

    return this.formatFeedback(fb);
  }

  async remove(user: User, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg || msg.user_id !== user.id) {
      throw new NotFoundException("Message not found");
    }

    await this.prisma.feedback.deleteMany({
      where: {
        message_id: messageId,
        user_id: user.id,
      },
    });
  }
}
