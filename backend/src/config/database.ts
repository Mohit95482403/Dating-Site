import mysql, { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import config from './env';
import { logger } from '../utils/logger';

const { host, port: dbPort, name: dbName, user, password } = config.env.database;

// Create MySQL connection pool with production-grade configurations
export const pool = mysql.createPool({
  host,
  port: dbPort,
  database: dbName,
  user,
  password,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: 'Z', // UTC-oriented timestamps
  dateStrings: true
});


/**
 * Execute a parameterized SELECT query returning typed row arrays
 */
export async function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as unknown as T;
}

/**
 * Execute a parameterized INSERT/UPDATE/DELETE query returning execution metadata (insertId, affectedRows, etc.)
 */
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}


/**
 * Retrieve a dedicated connection from the pool for manual workflows
 */
export async function getConnection(): Promise<PoolConnection> {
  return await pool.getConnection();
}

/**
 * Execute a callback inside an atomic MySQL transaction.
 * Automatically commits on success, and rolls back on failure before releasing the connection.
 */
export async function transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
      logger.warn('[Database] Transaction rolled back due to error');
    } catch (rollbackError) {
      logger.error('[Database] Failed to rollback transaction:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verify connectivity to the database
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS current_db, VERSION() AS version');
    const dbInfo = rows[0] as { current_db: string; version: string };
    logger.info(`[Database] Connected to MySQL database "${dbInfo.current_db}" (v${dbInfo.version}) at ${host}:${dbPort}`);
    connection.release();
    return true;

  } catch (error) {
    logger.error('[Database] Connection check failed:', error instanceof Error ? error.message : error);
    return false;
  }
};

export default pool;
