import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '@prisma/client';

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Pushes notification events over Supabase Realtime Broadcast.
 *
 * Broadcast (not Postgres Changes/RLS) is deliberate: this app authenticates
 * with its own JWTs, not Supabase Auth, so RLS-gated change-data-capture would
 * never authorize the anon-key browser client (the RLS policy keys off a
 * Postgres session variable only this API's own connections ever set). Each
 * user's channel name embeds their own UUID — a client only ever knows and
 * can subscribe to its own channel, which is what keeps this scoped per-user.
 */
@Injectable()
export class NotificationsRealtimeService {
  private readonly logger = new Logger(NotificationsRealtimeService.name);
  private readonly client: SupabaseClient | null;

  constructor(config: ConfigService) {
    const sb = config.get<SupabaseConfig>('supabase')!;
    this.client =
      sb.url && sb.serviceRoleKey ? createClient(sb.url, sb.serviceRoleKey, { auth: { persistSession: false } }) : null;
    if (!this.client) {
      this.logger.warn('Supabase not configured — notification realtime broadcast is disabled (safe no-op).');
    }
  }

  static channelName(userId: string): string {
    return `notifications:user:${userId}`;
  }

  async broadcastNewNotification(notification: Notification): Promise<void> {
    await this.send(notification.userId, 'new_notification', { notification });
  }

  async broadcastUpdate(notification: Notification): Promise<void> {
    await this.send(notification.userId, 'notification_updated', { notification });
  }

  async broadcastCountChanged(_tenantId: string, userId: string): Promise<void> {
    await this.send(userId, 'count_changed', {});
  }

  /**
   * A freshly created channel's websocket handshake isn't done yet the
   * instant `.channel()` returns — calling `.send()` immediately raced that
   * handshake and silently dropped the broadcast whenever it lost (the exact
   * "sometimes updates, sometimes doesn't" symptom). Waiting for the
   * subscribe callback to report SUBSCRIBED guarantees the send actually
   * goes out; a timeout keeps a stalled realtime connection from hanging
   * this fire-and-forget call forever (callers already treat it as
   * best-effort via `.catch()`).
   */
  private async send(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.client) return;
    const channel = this.client.channel(NotificationsRealtimeService.channelName(userId));
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Realtime subscribe timed out')), 5000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout);
            reject(new Error(`Realtime channel subscribe failed: ${status}`));
          }
        });
      });
      await channel.send({ type: 'broadcast', event, payload });
    } finally {
      await this.client.removeChannel(channel);
    }
  }
}
