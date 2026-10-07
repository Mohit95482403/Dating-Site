import { ServerOptions } from 'socket.io';
import config from './env';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: config.env.cors.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
};

export default socketConfig;
