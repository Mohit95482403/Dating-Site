import mysql, { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import config from './env';
import { logger } from '../utils/logger';

const { host, port: dbPort, name: dbName, user, password } = config.env.database;

// Create MySQL connection pool with production-grade configurations
const poolConfig: mysql.PoolOptions = {
  host,
  port: dbPort,
  database: dbName,
  user,
  password,
  waitForConnections: true,
  connectionLimit: config.env.isProduction ? 10 : 15,
  maxIdle: config.env.isProduction ? 10 : 15,
  idleTimeout: 60000,
  connectTimeout: 20000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: 'Z', // UTC-oriented timestamps
  dateStrings: true,
};

// Enable SSL for production cloud databases (PlanetScale, Aiven, Railway, etc.)
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = mysql.createPool(poolConfig);

const isTransientConnError = (err: any): boolean => {
  if (!err) return false;
  const code = err.code || '';
  return (
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
    err.fatal === true
  );
};

/**
 * Execute a parameterized SELECT query returning typed row arrays with resilient connection retry
 */
export async function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  try {
    const [rows] = await pool.query(sql, params);
    return rows as unknown as T;
  } catch (err: any) {
    if (isTransientConnError(err)) {
      logger.warn(`[Database] Transient connection error (${err?.code}), retrying query with fresh connection...`);
      const [retryRows] = await pool.query(sql, params);
      return retryRows as unknown as T;
    }
    throw err;
  }
}

/**
 * Execute a parameterized INSERT/UPDATE/DELETE query returning execution metadata with resilient connection retry
 */
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(sql, params);
    return result;
  } catch (err: any) {
    if (isTransientConnError(err)) {
      logger.warn(`[Database] Transient connection error (${err?.code}), retrying execute with fresh connection...`);
      const [retryResult] = await pool.execute<ResultSetHeader>(sql, params);
      return retryResult;
    }
    throw err;
  }
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
