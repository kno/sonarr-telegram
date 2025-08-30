import { dbPool } from '../pool';

export class AllowedChannelRepo {
  static async list(): Promise<number[]> {
    const [rows] = await dbPool.query<any[]>('SELECT channel_id FROM allowed_channels');
    return rows.map((r) => Number(r.channel_id));
  }

  static async add(channelId: number): Promise<void> {
    await dbPool.query('INSERT IGNORE INTO allowed_channels (channel_id) VALUES (?)', [channelId]);
  }

  static async remove(channelId: number): Promise<void> {
    await dbPool.query('DELETE FROM allowed_channels WHERE channel_id=?', [channelId]);
  }
}

