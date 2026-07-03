import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Mailer service delivering emails via Google SMTP (Nodemailer) with fallback
 * mock printing for local development.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const smtp = this.config.get('smtp');
    if (smtp?.user && smtp?.pass) {
      const secure = smtp.port === 465;
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });
      this.logger.log(`SMTP Mailer initialized using user ${smtp.user} (secure: ${secure})`);
    } else {
      this.logger.warn(
        'SMTP user/password not configured. Real emails will NOT be sent. Falling back to console logging.',
      );
    }
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const smtp = this.config.get('smtp');
    const from = smtp?.from || 'TimeForge Team <no-reply@timeforge.com>';

    if (this.transporter) {
      try {
        this.logger.log(`Attempting to send email to ${to} with subject "${subject}"...`);
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          text: body,
        });
        this.logger.log(`Email delivered to ${to}. MessageId: ${info.messageId}`);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to send email to ${to} via SMTP: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Handle email send failures gracefully without rolling back account creation
      }
    } else {
      this.logger.log(`[MOCK MAIL] From: ${from} | To: ${to} | Subject: ${subject}\nBody:\n${body}`);
    }
  }
}
