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
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { Request, Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import {
  AdminLoginDto,
  CreateAdminAccountDto,
  UpdateModelConfigDto,
  UpdateUserLimitDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from "./dto/admin.dto";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.adminService.adminLogin(dto, userAgent, ip);

    const cookieName = this.configService.get<string>(
      "refreshTokenCookieName",
      "chat_crazy_refresh",
    );
    const refreshDays = this.configService.get<number>(
      "refreshTokenExpireDays",
      30,
    );
    const sameSite = this.configService.get<string>(
      "refreshTokenCookieSameSite",
      "lax",
    );
    const secure = this.configService.get<boolean>(
      "refreshTokenCookieSecure",
      false,
    );

    res.cookie(cookieName, tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: sameSite as any,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });

    return tokens;
  }

  @Get("config")
  @UseGuards(JwtAuthGuard)
  getAdminConfig(@CurrentUser() user: User) {
    return this.adminService.getAdminConfig(user);
  }

  @Get("model-config")
  @UseGuards(JwtAuthGuard)
  getAdminModelConfig(@CurrentUser() user: User) {
    return this.adminService.getModelConfig(user);
  }

  @Patch("model-config")
  @UseGuards(JwtAuthGuard)
  updateAdminModelConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateModelConfigDto,
  ) {
    return this.adminService.updateModelConfig(user, dto);
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  getAdminDashboard(@CurrentUser() user: User) {
    return this.adminService.getAdminDashboard(user);
  }

  @Get("accounts")
  @UseGuards(JwtAuthGuard)
  getAdminAccounts(@CurrentUser() user: User) {
    return this.adminService.getAdminAccounts(user);
  }

  @Patch("users/:userId/limits")
  @UseGuards(JwtAuthGuard)
  updateAdminUserLimit(
    @CurrentUser() user: User,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserLimitDto,
  ) {
    return this.adminService.updateUserLimit(user, userId, dto);
  }

  @Patch("users/:userId/status")
  @UseGuards(JwtAuthGuard)
  updateUserStatus(
    @CurrentUser() user: User,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user, userId, dto);
  }

  @Patch("users/:userId/role")
  @UseGuards(JwtAuthGuard)
  updateUserRole(
    @CurrentUser() user: User,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(user, userId, dto);
  }

  @Post("create-admin")
  @UseGuards(JwtAuthGuard)
  createAdminAccount(
    @CurrentUser() user: User,
    @Body() dto: CreateAdminAccountDto,
  ) {
    return this.adminService.createAdminAccount(user, dto);
  }

  @Delete("users/:userId")
  @UseGuards(JwtAuthGuard)
  deleteUserAccount(
    @CurrentUser() user: User,
    @Param("userId") userId: string,
  ) {
    return this.adminService.deleteUserAccount(user, userId);
  }
}
