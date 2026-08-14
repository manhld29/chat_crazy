import { Controller, Get, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UsageService } from "./usage.service";

@Controller("usage")
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get("me")
  getMe(@CurrentUser() user: User) {
    return this.usageService.getUserUsage(user);
  }
}
