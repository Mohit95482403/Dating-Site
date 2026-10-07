import { query } from '../config/database';
import { InterestRow } from '../types/profile.types';
import { RowDataPacket } from 'mysql2/promise';

export class InterestModel {
  public static async findAll(): Promise<InterestRow[]> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, name, slug, created_at FROM interests ORDER BY name ASC'
    );
    return rows as unknown as InterestRow[];
  }

  public static async findBySlug(slug: string): Promise<InterestRow | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, name, slug, created_at FROM interests WHERE slug = ? LIMIT 1',
      [slug]
    );
    return (rows[0] as InterestRow) || null;
  }
}

export default InterestModel;
