import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Example queue consumer. Jobs are idempotent (deterministic jobId) so retries
 * never duplicate side effects (Phase 2 §19).
 */
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing notification job ${job.id} (${job.name})`);
    // Phase 6+: deliver in-app / email notifications from domain events.
  }
}
