import http from 'http';
import createApp from './app';
import config from './config/env';
import { testDatabaseConnection, pool } from './config/database';
import { initializeDatabase } from './config/databaseInit';
import { initSocket, getIO } from './sockets/socket';
import { logger } from './utils/logger';
import { CallService } from './services/call.service';

const PORT = config.env.port;

const startServer = async () => {
  try {
    logger.info('Starting Connectly Backend Application...');

    // 1. Initialize Express App
    const app = createApp();

    // 2. Create unified HTTP Server
    const httpServer = http.createServer(app);

    // 3. Attach Socket.IO to HTTP Server
    const io = initSocket(httpServer);
    logger.info('Socket.IO Gateway attached to HTTP server');

    // 4. Verify Database Connection and Initialize Schema
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      await initializeDatabase();
      // Purge any stale ringing or accepted calls from prior server runs
      await CallService.cleanupStaleCallsOnStartup();
      CallService.startPeriodicCleanup();
    } else {
      logger.warn('MySQL Database connection could not be established at startup. Ensure MySQL server is running.');
    }

    // 5. Start listening
    httpServer.listen(PORT, () => {
      logger.info(`===============================================`);
      logger.info(`🚀 Connectly Server running on port ${PORT}`);
      logger.info(`📡 REST API: http://localhost:${PORT}/api`);
      logger.info(`💓 Health Check: http://localhost:${PORT}/api/health`);
      logger.info(`💓 Liveness: http://localhost:${PORT}/api/health/live`);
      logger.info(`💓 Readiness: http://localhost:${PORT}/api/health/ready`);
      logger.info(`🗄️  DB Health Check: http://localhost:${PORT}/api/health/db`);
      logger.info(`⚡ Socket.IO Ready on port ${PORT}`);
      logger.info(`===============================================`);
    });

    // Production-Grade Graceful Shutdown
    let isShuttingDown = false;

    const handleShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      CallService.stopPeriodicCleanup();

      logger.info(`[Shutdown] Received ${signal}. Initiating graceful shutdown...`);

      // Set a hard timeout to force exit if graceful cleanup hangs
      const forceExitTimeout = setTimeout(() => {
        logger.error('[Shutdown] Forced shutdown timed out after 10s. Exiting immediately.');
        process.exit(1);
      }, 10000);
      forceExitTimeout.unref();

      // 1. Stop accepting new HTTP requests
      httpServer.close(async (httpErr) => {
        if (httpErr) {
          logger.error('[Shutdown] Error closing HTTP server:', httpErr);
        } else {
          logger.info('[Shutdown] HTTP listener successfully closed.');
        }

        // 2. Safely close Socket.IO gateway
        try {
          if (io) {
            io.close(() => {
              logger.info('[Shutdown] Socket.IO gateway connections closed.');
            });
          }
        } catch (socketErr) {
          logger.warn('[Shutdown] Socket.IO shutdown warning:', socketErr);
        }

        // 3. Drain and close MySQL database connection pool
        try {
          await pool.end();
          logger.info('[Shutdown] MySQL connection pool closed cleanly.');
        } catch (dbErr) {
          logger.error('[Shutdown] Error draining MySQL connection pool:', dbErr);
        }

        clearTimeout(forceExitTimeout);
        logger.info('[Shutdown] Connectly shutdown completed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    // Catch uncaught exceptions and unhandled promise rejections
    process.on('uncaughtException', (err) => {
      logger.error('[Fatal] Uncaught Exception:', err);
      handleShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('[Fatal] Unhandled Promise Rejection:', reason);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
