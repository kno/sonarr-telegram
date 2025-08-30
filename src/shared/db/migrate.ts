import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { dbPool } from './pool';
import { logger } from '../logging/logger';
import { setTimeout as sleep } from 'timers/promises';

async function ensureMigrationsTable(): Promise<void> {
  await dbPool.query(`CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

async function appliedMigrations(): Promise<Set<string>> {
  const [rows] = await dbPool.query<{ name: string }[]>('SELECT name FROM migrations');
  return new Set(rows.map((r) => r.name));
}

async function waitForDb(maxAttempts = 30, delayMs = 1000): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      const conn = await dbPool.getConnection();
      try {
        await conn.ping();
        conn.release();
        return;
      } catch (err) {
        conn.release();
        throw err;
      }
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) {
        logger.error({ err }, 'Database not reachable after retries');
        throw err;
      }
      logger.warn({ attempt }, 'Waiting for database to be ready...');
      await sleep(delayMs);
    }
  }
}

export async function runMigrations(migrationsDir = 'migrations'): Promise<void> {
  await waitForDb();
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    logger.info({ file }, 'Applying migration');
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(sql);
      await conn.query('INSERT INTO migrations (name) VALUES (?)', [file]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

// Allow running directly via bun
if (import.meta.main) {
  runMigrations().then(
    () => {
      logger.info('Migrations complete');
      process.exit(0);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    },
  );
}
