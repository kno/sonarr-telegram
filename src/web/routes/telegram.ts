import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/logging/logger';
import { Api, TelegramClient } from 'telegram';
import { computeCheck } from 'telegram/Password.js';
import { StringSession } from 'telegram/sessions/index.js';
import { TelegramSessionRepo } from '../../shared/db/repositories/TelegramSessionRepo';
import crypto from 'crypto';
import { telegramService } from '../../services/telegram/TelegramService';

// Reuse the same encryption scheme as TelegramService
function encrypt(data: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

type LoginState = {
  client: TelegramClient;
  phoneNumber: string;
  phoneCodeHash: string;
  createdAt: number;
};

const loginStates = new Map<string, LoginState>();
const LOGIN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupOldStates() {
  const now = Date.now();
  for (const [key, state] of loginStates.entries()) {
    if (now - state.createdAt > LOGIN_TTL_MS) {
      try {
        void state.client.disconnect();
      } catch {}
      loginStates.delete(key);
    }
  }
}

async function createClient(sessionString = ''): Promise<TelegramClient> {
  const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = env;
  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH) {
    throw new Error('Telegram API not configured');
  }
  const client = new TelegramClient(new StringSession(sessionString), TELEGRAM_API_ID, TELEGRAM_API_HASH, {
    connectionRetries: 5,
  });
  await client.connect();
  return client;
}

export const telegramRouter = Router();

// GET /api/telegram/status -> { configured: boolean, loggedIn: boolean }
telegramRouter.get('/status', async (_req, res, next) => {
  try {
    const configured = Boolean(env.TELEGRAM_API_ID && env.TELEGRAM_API_HASH && env.TELEGRAM_ENC_SECRET);
    const rec = await TelegramSessionRepo.get();
    res.json({ configured, loggedIn: Boolean(rec) });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/login/start { phone: string }
telegramRouter.post('/login/start', async (req, res, next) => {
  try {
    cleanupOldStates();
    const schema = z.object({ phone: z.string().min(5) });
    const { phone } = schema.parse(req.body ?? {});

    const client = await createClient('');
    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: env.TELEGRAM_API_ID!,
        apiHash: env.TELEGRAM_API_HASH!,
        settings: new Api.CodeSettings({})
      })
    );

    const loginId = crypto.randomBytes(16).toString('hex');
    loginStates.set(loginId, {
      client,
      phoneNumber: phone,
      phoneCodeHash: result.phoneCodeHash,
      createdAt: Date.now(),
    });

    res.status(200).json({ loginId, type: result.type?.className ?? 'code', next: 'verify' });
  } catch (err) {
    logger.error({ err }, 'Telegram start login error');
    next(err);
  }
});

// POST /api/telegram/login/verify { loginId: string, code: string }
telegramRouter.post('/login/verify', async (req, res, next) => {
  try {
    const schema = z.object({ loginId: z.string().length(32), code: z.string().min(3) });
    const { loginId, code } = schema.parse(req.body ?? {});
    const state = loginStates.get(loginId);
    if (!state) return res.status(400).json({ error: 'Invalid or expired loginId' });

    try {
      await state.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: state.phoneNumber,
          phoneCodeHash: state.phoneCodeHash,
          phoneCode: code,
        })
      );
    } catch (e: any) {
      const msg: string = e?.message || e?.errorMessage || '';
      if (msg.includes('SESSION_PASSWORD_NEEDED')) {
        return res.status(200).json({ status: '2fa_required', next: '2fa' });
      }
      throw e;
    }

    // Authorized -> persist session
    const sessionStr = (state.client.session as StringSession).save();
    if (!env.TELEGRAM_ENC_SECRET) throw new Error('Missing TELEGRAM_ENC_SECRET');
    const encrypted = encrypt(sessionStr, env.TELEGRAM_ENC_SECRET);
    await TelegramSessionRepo.upsert(encrypted, 1);

    // swap running service to new session
    try {
      await telegramService.stop();
      await telegramService.start();
    } catch (err) {
      logger.warn({ err }, 'Telegram service restart after login failed');
    }

    // cleanup state
    try { await state.client.disconnect(); } catch {}
    loginStates.delete(loginId);
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Telegram verify code error');
    next(err);
  }
});

// POST /api/telegram/login/2fa { loginId: string, password: string }
telegramRouter.post('/login/2fa', async (req, res, next) => {
  try {
    const schema = z.object({ loginId: z.string().length(32), password: z.string().min(1) });
    const { loginId, password } = schema.parse(req.body ?? {});
    const state = loginStates.get(loginId);
    if (!state) return res.status(400).json({ error: 'Invalid or expired loginId' });

    const pwdInfo = await state.client.invoke(new Api.account.GetPassword());
    const passwordSrp = await computeCheck(pwdInfo, password);
    await state.client.invoke(new Api.auth.CheckPassword({ password: passwordSrp }));

    const sessionStr = (state.client.session as StringSession).save();
    if (!env.TELEGRAM_ENC_SECRET) throw new Error('Missing TELEGRAM_ENC_SECRET');
    const encrypted = encrypt(sessionStr, env.TELEGRAM_ENC_SECRET);
    await TelegramSessionRepo.upsert(encrypted, 1);

    try {
      await telegramService.stop();
      await telegramService.start();
    } catch (err) {
      logger.warn({ err }, 'Telegram service restart after 2FA failed');
    }

    try { await state.client.disconnect(); } catch {}
    loginStates.delete(loginId);
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Telegram 2FA error');
    next(err);
  }
});

// POST /api/telegram/logout -> clears saved session
telegramRouter.post('/logout', async (_req, res, next) => {
  try {
    await TelegramSessionRepo.clear();
    try {
      await telegramService.stop();
    } catch {}
    res.status(200).json({ status: 'logged_out' });
  } catch (err) {
    next(err);
  }
});
