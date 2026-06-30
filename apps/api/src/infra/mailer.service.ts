import { Injectable, Logger } from '@nestjs/common';

/**
 * Mailer abstraction. The foundation logs emails (verification, reset,
 * notifications); wire a real SMTP/API provider in production.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[mail] to=${to} subject="${subject}" body="${body.slice(0, 80)}…"`);
  }
}
