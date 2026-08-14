import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ConversationsService } from "./conversations.service";
import {
  CreateConversationDto,
  UpdateConversationDto,
} from "./dto/conversations.dto";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query("include_archived") includeArchived?: string,
  ) {
    return this.conversationsService.findUserConversations(
      user,
      includeArchived === "true",
    );
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(user, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.conversationsService.findOne(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(user, id, dto);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  archive(@CurrentUser() user: User, @Param("id") id: string) {
    return this.conversationsService.setArchiveStatus(user, id, true);
  }

  @Post(":id/unarchive")
  @HttpCode(HttpStatus.OK)
  unarchive(@CurrentUser() user: User, @Param("id") id: string) {
    return this.conversationsService.setArchiveStatus(user, id, false);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    await this.conversationsService.remove(user, id);
  }
}
