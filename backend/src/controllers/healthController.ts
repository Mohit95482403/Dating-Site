import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import config from '../config/env';
import { HealthService } from '../services/health.service';

export class HealthController {
  /**
   * GET /api/health - General API health and quick status
   */
  public static getApiHealth = async (_req: Request, res: Response): Promise<void> => {
    const isLive = await HealthService.checkLiveness();
    const readiness = await HealthService.checkReadiness();

    ApiResponse.success(
      res,
      'Connectly API is healthy and operational',
      {
        status: readiness.ready ? 'healthy' : 'degraded',
        environment: config.env.nodeEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: readiness.ready ? 'connected' : 'disconnected',
        dbLatencyMs: readiness.latencyMs,
      },
      HttpStatus.OK
    );
  };

  /**
   * GET /api/health/live - Liveness probe (Kubernetes / Docker)
   */
  public static getLiveness = async (_req: Request, res: Response): Promise<void> => {
    res.status(HttpStatus.OK).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * GET /api/health/ready - Readiness probe (Checks DB and core dependencies)
   */
  public static getReadiness = async (_req: Request, res: Response): Promise<void> => {
    const readiness = await HealthService.checkReadiness();

    if (readiness.ready) {
      res.status(HttpStatus.OK).json({
        status: 'READY',
        database: 'UP',
        latencyMs: readiness.latencyMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'DOWN',
        database: 'DOWN',
        error: readiness.error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/health/db - Direct database connectivity check
   */
  public static getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
    const readiness = await HealthService.checkReadiness();

    if (readiness.ready) {
      ApiResponse.success(
        res,
        'Database connection is healthy',
        {
          database: config.env.database.name,
          status: 'connected',
          latencyMs: readiness.latencyMs,
        },
        HttpStatus.OK
      );
    } else {
      ApiResponse.error(
        res,
        `Database connection failed: ${readiness.error}`,
        [],
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  };
}

export default HealthController;
