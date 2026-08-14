import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { AuthService } from "./auth.service";
import {
  GuestDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  UpgradeGuestDto,
} from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
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

    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: sameSite as any,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });
  }

  private clearRefreshCookie(res: Response) {
    const cookieName = this.configService.get<string>(
      "refreshTokenCookieName",
      "chat_crazy_refresh",
    );
    res.clearCookie(cookieName, { path: "/api/v1/auth" });
  }

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.authService.register(dto, userAgent, ip);
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.authService.login(dto, userAgent, ip);
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }

  @Post("guest")
  async guest(
    @Body() dto: GuestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.authService.guest(dto, userAgent, ip);
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>(
      "refreshTokenCookieName",
      "chat_crazy_refresh",
    );
    const refreshToken = dto.refresh_token || req.cookies?.[cookieName];
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.authService.refresh(refreshToken, userAgent, ip);
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>(
      "refreshTokenCookieName",
      "chat_crazy_refresh",
    );
    const refreshToken = dto.refresh_token || req.cookies?.[cookieName];
    const result = await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);
    return result;
  }

  @Post("upgrade-guest")
  @UseGuards(JwtAuthGuard)
  async upgradeGuest(
    @CurrentUser() user: User,
    @Body() dto: UpgradeGuestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;
    const tokens = await this.authService.upgradeGuest(
      user,
      dto,
      userAgent,
      ip,
    );
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }
}
