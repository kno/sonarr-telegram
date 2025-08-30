/*
  TelegramService (GramJS)
  - Manages MTProto session with encrypted storage
  - Filters allowed channels
  - Enqueues messages with torrent/magnet links
*/
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { logger } from '../../shared/logging/logger';
import { env, allowedChannels } from '../../shared/config/env';
import { extractLinks } from '../../shared/utils/parser';
import { messageQueue } from '../../worker/queue';
import crypto from 'crypto';
import { TelegramSessionRepo } from '../../shared/db/repositories/TelegramSessionRepo';
import { AllowedChannelRepo } from '../../shared/db/repositories/AllowedChannelRepo';


function encrypt(data: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}
function decrypt(blob: string, secret: string): string {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

export class TelegramService {
  private client: TelegramClient | null = null;
  private running = false;

  async start(): Promise<void> {
    if (!env.TELEGRAM_API_ID || !env.TELEGRAM_API_HASH) {
      logger.warn('Telegram not configured (API ID/HASH missing). Skipping start.');
      return;
    }
    if (!env.TELEGRAM_ENC_SECRET) {
      logger.warn('Telegram encryption secret not set. Skipping start.');
      return;
    }
    const session = await this.loadSession();
    const saved = session.save();
    if (!saved) {
      logger.info('No Telegram session found. Skipping Telegram client start until web login completes.');
      return;
    }
    this.client = new TelegramClient(session, env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, {
      connectionRetries: 5,
    });

    // With a valid StringSession, connecting is sufficient; avoid interactive start()
    await this.client.connect();

    this.running = true;
    logger.info('Telegram client connected with stored session');
    void this.subscribe();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.client) await this.client.disconnect();
    this.client = null;
  }

  private async subscribe(): Promise<void> {
    if (!this.client) return;
    // Prefer DB allowlist, fallback to env if empty
    const dbAllow = new Set(await AllowedChannelRepo.list());
    const allow = dbAllow.size > 0 ? dbAllow : new Set(allowedChannels());
    this.client.addEventHandler(async (update) => {
      try {
        if (!('message' in update) || !update.message) return;
        const msg = (update as any).message as Api.Message;
        if (!(msg instanceof Api.Message)) return;
        const peer = msg.peerId as any;
        const channelId = 'channelId' in peer ? Number(peer.channelId?.toString()) : undefined;
        if (allow.size > 0 && (!channelId || !allow.has(channelId))) return;

        const text = msg.message || '';
        const links = extractLinks(text);
        if (links.length === 0) return;
        await messageQueue.add('message', { text, links, source: 'telegram' });
      } catch (err) {
        logger.error({ err }, 'Telegram update handler error');
      }
    });
  }

  private async loadSession(): Promise<StringSession> {
    if (!env.TELEGRAM_ENC_SECRET) throw new Error('Missing TELEGRAM_ENC_SECRET');
    const rec = await TelegramSessionRepo.get();
    if (!rec) return new StringSession('');
    const raw = decrypt(rec.session_encrypted, env.TELEGRAM_ENC_SECRET);
    return new StringSession(raw);
  }

  async saveSession(): Promise<void> {
    if (!env.TELEGRAM_ENC_SECRET) throw new Error('Missing TELEGRAM_ENC_SECRET');
    if (!this.client) return;
    const session = (this.client.session as StringSession).save();
    const encrypted = encrypt(session, env.TELEGRAM_ENC_SECRET);
    await TelegramSessionRepo.upsert(encrypted, 1);
  }
}

export const telegramService = new TelegramService();
