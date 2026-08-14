import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateMemoryDto } from "./dto/create-memory.dto";
import { MemoryService } from "./memory.service";

@Controller("memories")
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  findUserMemories(@CurrentUser() user: User) {
    return this.memoryService.findUserMemories(user);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateMemoryDto) {
    return this.memoryService.create(user, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(@CurrentUser() user: User, @Param("id") id: string) {
    await this.memoryService.deleteOne(user, id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@CurrentUser() user: User) {
    await this.memoryService.deleteAll(user);
  }
}
