import { dbPool } from '../pool';

export type TelegramSessionRecord = {
  id: number; // always 1
  session_encrypted: string;
  key_version: number;
  updated_at: Date;
};

export class TelegramSessionRepo {
  static async get(): Promise<TelegramSessionRecord | null> {
    const [rows] = await dbPool.query<any[]>('SELECT * FROM telegram_sessions WHERE id=1 LIMIT 1');
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      session_encrypted: r.session_encrypted,
      key_version: r.key_version,
      updated_at: new Date(r.updated_at),
    };
  }

  static async upsert(encrypted: string, keyVersion = 1): Promise<void> {
    await dbPool.query(
      `INSERT INTO telegram_sessions (id, session_encrypted, key_version) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE session_encrypted=VALUES(session_encrypted), key_version=VALUES(key_version)`,
      [encrypted, keyVersion],
    );
  }

  static async clear(): Promise<void> {
    await dbPool.query('DELETE FROM telegram_sessions WHERE id=1');
  }
}
