import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UpsertFeedbackDto } from "./dto/upsert-feedback.dto";
import { FeedbackService } from "./feedback.service";

@Controller("messages/:messageId/feedback")
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Put()
  upsert(
    @CurrentUser() user: User,
    @Param("messageId") messageId: string,
    @Body() dto: UpsertFeedbackDto,
  ) {
    return this.feedbackService.upsert(user, messageId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param("messageId") messageId: string,
  ) {
    await this.feedbackService.remove(user, messageId);
  }
}
