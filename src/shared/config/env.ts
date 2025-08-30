import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).default(3000),
  TRUST_PROXY: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(120),

  // Redis for queue
  REDIS_URL: z.string().default('redis://redis:6379'),

  // MariaDB
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default('app'),
  DB_PASSWORD: z.string().default('app'),
  DB_NAME: z.string().default('sonarr_telegram'),

  // Sonarr
  SONARR_URL: z.string().url().optional(),
  SONARR_API_KEY: z.string().optional(),

  // Telegram (GramJS)
  TELEGRAM_API_ID: z.coerce.number().int().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
  TELEGRAM_ENC_SECRET: z.string().min(16).optional(),

  // Allowed channels (comma-separated numeric IDs)
  TELEGRAM_ALLOWED_CHANNELS: z.string().default(''),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;

export function allowedChannels(): number[] {
  if (!env.TELEGRAM_ALLOWED_CHANNELS) return [];
  return env.TELEGRAM_ALLOWED_CHANNELS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}
