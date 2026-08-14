import { Body, Controller, Param, Post, Res, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { ChatStreamDto } from "./dto/chat-stream.dto";

@Controller("conversations/:conversationId/messages/stream")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async streamMessage(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Body() dto: ChatStreamDto,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = this.chatService.streamMessage(user, conversationId, dto);

    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  }
}
