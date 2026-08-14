import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const rawPort = this.configService.get<string | number>("SMTP_PORT", 587);
    const port = typeof rawPort === "string" ? parseInt(rawPort, 10) : rawPort;
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");

    this.logger.log(`[MAIL_SERVICE_INIT] Checking SMTP configuration...`);
    this.logger.log(`[MAIL_SERVICE_INIT] SMTP_HOST: ${host || "NOT SET"}`);
    this.logger.log(`[MAIL_SERVICE_INIT] SMTP_PORT: ${port || 587}`);
    this.logger.log(`[MAIL_SERVICE_INIT] SMTP_USER: ${user ? "PROVIDED" : "NOT SET"}`);
    this.logger.log(`[MAIL_SERVICE_INIT] SMTP_PASS: ${pass ? "PROVIDED (MASKED)" : "NOT SET"}`);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`✅ [MAIL_SERVICE_INIT] SMTP transporter created successfully for ${host}:${port || 587}`);
    } else {
      this.logger.warn(
        "⚠️ [MAIL_SERVICE_INIT] SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing on Vercel/Server. Emails cannot be delivered to inbox until these variables are added in Vercel Dashboard Settings.",
      );
    }
  }

  async sendPasswordResetEmail(email: string, rawToken: string): Promise<boolean> {
    let frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      const vercelUrl =
        process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
      if (vercelUrl) {
        frontendUrl = vercelUrl.startsWith("http")
          ? vercelUrl
          : `https://${vercelUrl}`;
      } else {
        frontendUrl = "http://localhost:3000";
      }
    }

    const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
    const fromAddress =
      this.configService.get<string>("SMTP_FROM") ||
      '"Funny Chatbot" <no-reply@chatcrazy.local>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
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

    this.logger.log(`🔑 [PASSWORD_RESET_LINK_LOGGED] Target Email: ${email} | Link (Expires in 10 mins): ${resetUrl}`);

    if (this.transporter) {
      try {
        this.logger.log(`📨 [MAIL_SENDING_ATTEMPT] Sending email to ${email} via SMTP ${fromAddress}...`);
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: "🔑 [Funny Chatbot] Đặt lại mật khẩu tài khoản",
          html: htmlContent,
        });
        this.logger.log(`✅ [MAIL_SEND_SUCCESS] Email sent successfully to ${email}. MessageId: ${info.messageId} | Response: ${info.response}`);
        return true;
      } catch (error: any) {
        this.logger.error(
          `❌ [MAIL_SEND_ERROR] Failed sending reset email to ${email}. Error: ${error.message} | Code: ${error.code || 'N/A'} | Command: ${error.command || 'N/A'}`,
          error.stack,
        );
        return false;
      }
    } else {
      this.logger.warn(
        `⚠️ [MAIL_SKIPPED_NO_SMTP] Cannot send email to ${email} because SMTP is not configured in Vercel environment variables. Link to use manually: ${resetUrl}`,
      );
    }

    return true;
  }
}
