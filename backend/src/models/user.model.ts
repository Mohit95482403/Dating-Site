import { query, execute } from '../config/database';
import { UserRow } from '../types/user.types';
import { AuthUser } from '../types/auth';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export class UserModel {
  public static async findById(id: number, conn?: PoolConnection): Promise<UserRow | null> {
    const sql = 'SELECT id, email, password_hash, role, status, is_email_verified, last_login_at, suspended_until, suspension_reason, created_at, updated_at FROM users WHERE id = ? LIMIT 1';
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [id]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [id]);
    return (rows[0] as UserRow) || null;
  }

  public static async findByEmail(email: string, conn?: PoolConnection): Promise<UserRow | null> {
    const sql = 'SELECT id, email, password_hash, role, status, is_email_verified, last_login_at, suspended_until, suspension_reason, created_at, updated_at FROM users WHERE email = ? LIMIT 1';
    const rows = conn
      ? ((await conn.query<RowDataPacket[]>(sql, [email]))[0] as RowDataPacket[])
      : await query<RowDataPacket[]>(sql, [email]);
    return (rows[0] as UserRow) || null;
  }

  public static async findUserWithProfile(id: number): Promise<AuthUser | null> {
    const sql = `
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.status, 
        u.is_email_verified, 
        u.created_at, 
        u.last_login_at,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.is_profile_complete,
        (SELECT file_url FROM photos WHERE user_id = u.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) AS avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [id]);
    if (!rows[0]) return null;

    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      isEmailVerified: Boolean(row.is_email_verified),
      isProfileComplete: Boolean(row.is_profile_complete),
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url || null,
      photoUrl: row.avatar_url || null,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    };
  }

  public static async create(
    email: string,
    passwordHash: string,
    role: string = 'user',
    conn?: PoolConnection
  ): Promise<number> {
    const sql = 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)';
    if (conn) {
      const [result] = await conn.execute(sql, [email, passwordHash, role]);
      return (result as any).insertId;
    }
    const result = await execute(sql, [email, passwordHash, role]);
    return result.insertId;
  }

  public static async updateLastLogin(id: number, conn?: PoolConnection): Promise<void> {
    const sql = 'UPDATE users SET last_login_at = NOW() WHERE id = ?';
    if (conn) {
      await conn.execute(sql, [id]);
    } else {
      await execute(sql, [id]);
    }
  }

  public static async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const res = await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    return res.affectedRows > 0;
  }

  public static async findByUsername(username: string): Promise<UserRow | null> {
    const sql = 'SELECT id, email, username, password_hash, role, status, is_email_verified, last_login_at, created_at, updated_at FROM users WHERE username = ? LIMIT 1';
    const rows = await query<RowDataPacket[]>(sql, [username]);
    return (rows[0] as UserRow) || null;
  }

  public static async findAccountInfo(userId: number): Promise<any | null> {
    const sql = `
      SELECT 
        u.id, 
        u.email, 
        u.username,
        u.role, 
        u.status, 
        u.is_email_verified, 
        u.created_at, 
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        (SELECT file_url FROM photos WHERE user_id = u.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1) AS avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
      LIMIT 1
    `;
    const rows = await query<RowDataPacket[]>(sql, [userId]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      username: r.username || null,
      firstName: r.first_name || '',
      lastName: r.last_name || null,
      avatarUrl: r.avatar_url || null,
      photoUrl: r.avatar_url || null,
      dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : null,
      gender: r.gender || null,
      isEmailVerified: Boolean(r.is_email_verified),
      role: r.role,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  public static async deleteAccount(userId: number): Promise<boolean> {
    const res = await execute('DELETE FROM users WHERE id = ?', [userId]);
    return res.affectedRows > 0;
  }
}

export default UserModel;
