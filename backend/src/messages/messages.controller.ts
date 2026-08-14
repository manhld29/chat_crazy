import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { MessagesService } from "./messages.service";

@Controller("conversations/:conversationId/messages")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findConversationMessages(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
  ) {
    return this.messagesService.findConversationMessages(user, conversationId);
  }
}
