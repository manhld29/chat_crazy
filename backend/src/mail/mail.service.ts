import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT", 587);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP transporter configured for host: ${host}`);
    } else {
      this.logger.warn(
        "SMTP credentials not fully configured. Reset links will be logged to console.",
      );
    }
  }

  async sendPasswordResetEmail(email: string, rawToken: string): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const fromAddress =
      this.configService.get<string>("SMTP_FROM") ||
      '"Funny Chatbot" <no-reply@chatcrazy.local>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #0f172a; color: #f8fafc;">
        <h2 style="color: #10b981; margin-top: 0;">Yêu cầu Đặt lại Mật khẩu</h2>
        <p>Chào bạn,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>${email}</strong>.</p>
        <p>Vui lòng nhấp vào liên kết bên dưới để tạo mật khẩu mới:</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #10b981; color: #020617; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Đặt lại mật khẩu mới
          </a>
        </div>
        <p style="color: #ef4444; font-weight: bold;">⚠️ Lưu ý: Link đặt lại mật khẩu này chỉ có hiệu lực trong vòng 10 phút.</p>
        <p style="font-size: 12px; color: #94a3b8;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu của bạn vẫn an toàn.</p>
      </div>
    `;

    this.logger.log(
      `🔑 [PASSWORD RESET LINK FOR ${email} (Expires in 10 mins)]: ${resetUrl}`,
    );

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: "🔑 [Funny Chatbot] Đặt lại mật khẩu tài khoản",
          html: htmlContent,
        });
        this.logger.log(`Password reset email sent to ${email}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}`, error.stack);
        return false;
      }
    }

    return true;
  }
}
