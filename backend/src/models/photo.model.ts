import { pool, query, execute } from '../config/database';
import { PhotoRow } from '../types/profile.types';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

export class PhotoModel {
  /**
   * Count total photos owned by a user
   */
  public static async countByUserId(
    userId: number,
    conn?: PoolConnection
  ): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM photos WHERE user_id = ?';
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return Number(rows[0]?.total || 0);
  }

  /**
   * Find all photos for a user ordered by primary first, then display_order and created_at
   */
  public static async findUserPhotosOrdered(
    userId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow[]> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE user_id = ?
      ORDER BY is_primary DESC, display_order ASC, created_at ASC
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return rows as unknown as PhotoRow[];
  }

  /**
   * Find all photos for a user ordered strictly by display_order
   */
  public static async findByUserId(
    userId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow[]> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE user_id = ?
      ORDER BY display_order ASC, created_at ASC
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [userId]);

    return rows as unknown as PhotoRow[];
  }

  /**
   * Find a photo by ID
   */
  public static async findById(
    photoId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow | null> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [photoId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [photoId]);

    return (rows[0] as unknown as PhotoRow) || null;
  }

  /**
   * Find a photo ensuring user ownership
   */
  public static async findUserPhoto(
    userId: number,
    photoId: number,
    conn?: PoolConnection
  ): Promise<PhotoRow | null> {
    const sql = `
      SELECT id, user_id, file_url, file_name, mime_type, file_size, display_order, is_primary,
             created_at, updated_at
      FROM photos
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `;
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [photoId, userId]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [photoId, userId]);

    return (rows[0] as unknown as PhotoRow) || null;
  }

  /**
   * Insert photo metadata into MySQL
   */
  public static async insert(
    photo: {
      userId: number;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      displayOrder: number;
      isPrimary: boolean;
    },
    conn?: PoolConnection
  ): Promise<number> {
    const sql = `
      INSERT INTO photos (user_id, file_url, file_name, mime_type, file_size, display_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      photo.userId,
      photo.fileUrl,
      photo.fileName,
      photo.mimeType,
      photo.fileSize,
      photo.displayOrder,
      photo.isPrimary ? 1 : 0,
    ];

    if (conn) {
      const [result] = await conn.execute<any>(sql, params);
      return result.insertId;
    }
    const result = await execute(sql, params);
    return result.insertId;
  }

  /**
   * Delete a photo record from MySQL with strict ownership check
   */
  public static async delete(
    userId: number,
    photoId: number,
    conn?: PoolConnection
  ): Promise<boolean> {
    const sql = 'DELETE FROM photos WHERE id = ? AND user_id = ?';
    const params = [photoId, userId];

    if (conn) {
      const [result] = await conn.execute<any>(sql, params);
      return result.affectedRows > 0;
    }
    const result = await execute(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * Set primary photo inside a transaction
   */
  public static async setPrimary(
    userId: number,
    photoId: number,
    conn: PoolConnection
  ): Promise<void> {
    // 1. Reset all photos of user to is_primary = FALSE
    await conn.execute('UPDATE photos SET is_primary = FALSE WHERE user_id = ?', [userId]);

    // 2. Set the target photo to is_primary = TRUE
    await conn.execute('UPDATE photos SET is_primary = TRUE WHERE id = ? AND user_id = ?', [
      photoId,
      userId,
    ]);
  }

  /**
   * Promote next available photo to primary
   */
  public static async promoteNextPrimary(
    userId: number,
    conn: PoolConnection
  ): Promise<number | null> {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM photos WHERE user_id = ? ORDER BY display_order ASC, created_at ASC LIMIT 1',
      [userId]
    );

    if (rows.length > 0) {
      const nextId = Number(rows[0].id);
      await conn.execute('UPDATE photos SET is_primary = TRUE WHERE id = ?', [nextId]);
      return nextId;
    }

    return null;
  }

  /**
   * Reorder photos inside a transaction
   */
  public static async reorder(
    userId: number,
    photoIds: number[],
    conn: PoolConnection
  ): Promise<void> {
    for (let index = 0; index < photoIds.length; index++) {
      const photoId = photoIds[index];
      await conn.execute(
        'UPDATE photos SET display_order = ? WHERE id = ? AND user_id = ?',
        [index, photoId, userId]
      );
    }
  }
}

export default PhotoModel;
