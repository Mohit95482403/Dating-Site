import { ServerOptions } from 'socket.io';
import config from './env';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/+$/, '');
      const allowed = config.env.cors.allowedOrigins;
      if (
        allowed.includes(normalized) ||
        (!config.env.isProduction &&
          (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
};

export default socketConfig;
