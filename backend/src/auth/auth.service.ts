import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  ForgotPasswordDto,
  GuestDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpgradeGuestDto,
} from "./dto/auth.dto";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    if (password.length > 256) {
      throw new BadRequestException("Password is too long");
    }
    return argon2.hash(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (password.length > 256 || !hash) return false;
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async createTokens(user: User, userAgent?: string, ipAddress?: string) {
    const payload = {
      sub: user.id,
      type: "access",
    };

    const accessTokenExpireMinutes = this.configService.get<number>(
      "accessTokenExpireMinutes",
      30,
    );
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${accessTokenExpireMinutes}m`,
    });

    const refreshTokenRaw = crypto.randomBytes(36).toString("base64url");
    const tokenHash = this.hashRefreshToken(refreshTokenRaw);

    const refreshDays = this.configService.get<number>(
      "refreshTokenExpireDays",
      30,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    const ipHash = ipAddress
      ? crypto
          .createHash("sha256")
          .update(`${this.configService.get("jwtSecretKey")}:${ipAddress}`)
          .digest("hex")
      : null;

    await this.prisma.refreshSession.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: userAgent || null,
        ip_hash: ipHash,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshTokenRaw,
      token_type: "bearer",
      user: this.formatUserPublic(user),
    };
  }

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        display_name: dto.display_name,
        password_hash: passwordHash,
        is_guest: false,
      },
    });

    return this.createTokens(user, userAgent, ipAddress);
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await this.verifyPassword(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createTokens(user, userAgent, ipAddress);
  }

  async guest(dto: GuestDto, userAgent?: string, ipAddress?: string) {
    const guestUsername = `guest_${crypto.randomBytes(8).toString("hex")}`;
    const user = await this.prisma.user.create({
      data: {
        username: guestUsername,
        display_name: dto.display_name || "Khách",
        is_guest: true,
      },
    });

    return this.createTokens(user, userAgent, ipAddress);
  }

  async refresh(
    refreshTokenRaw: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException("Refresh token is required");
    }

    const tokenHash = this.hashRefreshToken(refreshTokenRaw);
    const session = await this.prisma.refreshSession.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Revoke old session
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revoked_at: new Date() },
    });

    return this.createTokens(session.user, userAgent, ipAddress);
  }

  async logout(refreshTokenRaw?: string) {
    if (refreshTokenRaw) {
      const tokenHash = this.hashRefreshToken(refreshTokenRaw);
      await this.prisma.refreshSession.updateMany({
        where: { token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }
    return { message: "Logged out successfully" };
  }

  async upgradeGuest(
    currentUser: User,
    dto: UpgradeGuestDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!currentUser.is_guest) {
      throw new BadRequestException("User is not a guest");
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.hashPassword(dto.password);
    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        email: dto.email,
        display_name: dto.display_name,
        password_hash: passwordHash,
        is_guest: false,
      },
    });

    return this.createTokens(updatedUser, userAgent, ipAddress);
  }

  async forgotPassword(dto: ForgotPasswordDto, mailService: MailService) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (user && !user.is_guest) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expiration: 10 minutes

      await this.prisma.passwordResetToken.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });

      await mailService.sendPasswordResetEmail(user.email!, rawToken);
    }

    return {
      message:
        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.new_password.length < 6 || dto.new_password.length > 256) {
      throw new BadRequestException("Mật khẩu mới phải từ 6 đến 256 ký tự");
    }

    const tokenHash = crypto.createHash("sha256").update(dto.token).digest("hex");
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (
      !tokenRecord ||
      tokenRecord.used_at !== null ||
      tokenRecord.expires_at < new Date()
    ) {
      throw new BadRequestException(
        "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (chỉ có hiệu lực trong 10 phút).",
      );
    }

    const newPasswordHash = await this.hashPassword(dto.new_password);

    await this.prisma.user.update({
      where: { id: tokenRecord.user_id },
      data: { password_hash: newPasswordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used_at: new Date() },
    });

    await this.prisma.refreshSession.updateMany({
      where: { user_id: tokenRecord.user_id, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    return {
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    };
  }

  formatUserPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name || "Người dùng",
      is_guest: user.is_guest,
      is_active: user.is_active,
      is_admin: user.is_admin,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      last_login_at: user.last_login_at
        ? user.last_login_at.toISOString()
        : null,
    };
  }
}
