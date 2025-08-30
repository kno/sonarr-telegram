import mysql from 'mysql2/promise.js';
import { env } from '../config/env';

export const dbPool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
  enableKeepAlive: true,
  multipleStatements: true,
});

export async function pingDb(): Promise<void> {
  const conn = await dbPool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
