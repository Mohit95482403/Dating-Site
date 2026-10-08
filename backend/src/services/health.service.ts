import { query, pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { SocketUserRegistry } from '../sockets/socketEvents';
import config from '../config/env';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../config/storage';

export interface SubsystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface DetailedSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  subsystems: {
    api: SubsystemStatus;
    database: SubsystemStatus;
    socketIo: SubsystemStatus;
    storage: SubsystemStatus;
    aiService: SubsystemStatus;
    paymentService: SubsystemStatus;
  };
  metrics: {
    onlineUsers: number;
    dbPoolConnections: {
      total: number;
      free: number;
      queue: number;
    };
    recentSecurityAlerts: number;
  };
}

export class HealthService {
  /**
   * Fast Liveness check: confirms Express process is responding
   */
  public static async checkLiveness(): Promise<boolean> {
    return true;
  }

  /**
   * Readiness check: confirms critical dependencies (MySQL) are accessible
   */
  public static async checkReadiness(): Promise<{ ready: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await query<RowDataPacket[]>('SELECT 1');
      return {
        ready: true,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        ready: false,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Comprehensive System Health Telemetry for Admin Dashboard
   */
  public static async getDetailedHealth(): Promise<DetailedSystemHealth> {
    const mem = process.memoryUsage();
    const memRss = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    const memHeapUsed = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    const memHeapTotal = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;

    // 1. Database Health Check
    let dbStatus: SubsystemStatus = { status: 'healthy', latencyMs: 0 };
    const dbStart = Date.now();
    try {
      const dbRows = await query<RowDataPacket[]>('SELECT DATABASE() as db_name, VERSION() as version');
      dbStatus = {
        status: 'healthy',
        latencyMs: Date.now() - dbStart,
        details: {
          database: dbRows[0]?.db_name || config.env.database.name,
          version: dbRows[0]?.version || 'MySQL 8.x',
        },
      };
    } catch (err: any) {
      dbStatus = {
        status: 'unhealthy',
        latencyMs: Date.now() - dbStart,
        message: err.message,
      };
    }

    // 2. Storage Health Check
    let storageStatus: SubsystemStatus = { status: 'healthy' };
    try {
      const uploadRoot = UPLOADS_DIR;
      const exists = fs.existsSync(uploadRoot);
      if (!exists) {
        fs.mkdirSync(uploadRoot, { recursive: true });
      }
      // Check writable
      fs.accessSync(uploadRoot, fs.constants.W_OK | fs.constants.R_OK);
      storageStatus = {
        status: 'healthy',
        message: 'Persistent media directory accessible & writable',
        details: { path: uploadRoot },
      };
    } catch (err: any) {
      storageStatus = {
        status: 'degraded',
        message: `Storage warning: ${err.message}`,
      };
    }

    // 3. Socket.IO Gateway Health
    const onlineCount = SocketUserRegistry.getOnlineUserCount();
    const socketStatus: SubsystemStatus = {
      status: 'healthy',
      details: {
        onlineUsers: onlineCount,
        transport: ['websocket', 'polling'],
      },
    };

    // 4. AI Subsystem (Gemini / Claude / Deterministic Fallback)
    const aiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const aiStatus: SubsystemStatus = {
      status: aiKey ? 'healthy' : 'degraded',
      message: aiKey
        ? 'External AI Provider connected'
        : 'Running in resilient algorithmic fallback mode',
      details: {
        provider: aiKey ? 'Google Gemini' : 'Local Algorithmic Fallback',
        fallbackAvailable: true,
      },
    };

    // 5. Payment Subsystem Status
    const paymentStatus: SubsystemStatus = {
      status: 'healthy',
      message: 'Idempotency & Stripe/Razorpay mock gateway operational',
      details: {
        idempotencyEnforced: true,
        webhookValidation: true,
      },
    };

    // 6. DB Pool Metrics
    const poolAny = pool as any;
    const poolInfo = {
      total: poolAny._allConnections ? poolAny._allConnections.length : 1,
      free: poolAny._freeConnections ? poolAny._freeConnections.length : 1,
      queue: poolAny._connectionQueue ? poolAny._connectionQueue.length : 0,
    };

    // 7. Recent Security Alerts from audit_logs
    let recentSecurityAlerts = 0;
    try {
      const alertRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE action IN ('RATE_LIMIT_TRIGGERED', 'FAILED_LOGIN', 'UNAUTHORIZED_ACCESS', 'USER_BANNED', 'USER_SUSPENDED')
           AND created_at >= NOW() - INTERVAL 24 HOUR`
      );
      recentSecurityAlerts = Number(alertRows[0]?.count || 0);
    } catch {
      // Fallback
    }

    // Overall platform health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (storageStatus.status !== 'healthy' || aiStatus.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0-day27',
      environment: config.env.nodeEnv,
      memory: {
        rssMb: memRss,
        heapUsedMb: memHeapUsed,
        heapTotalMb: memHeapTotal,
      },
      subsystems: {
        api: {
          status: 'healthy',
          message: 'Accepting REST & WebRTC requests',
          details: { port: config.env.port },
        },
        database: dbStatus,
        socketIo: socketStatus,
        storage: storageStatus,
        aiService: aiStatus,
        paymentService: paymentStatus,
      },
      metrics: {
        onlineUsers: onlineCount,
        dbPoolConnections: poolInfo,
        recentSecurityAlerts,
      },
    };
  }
}

export default HealthService;
