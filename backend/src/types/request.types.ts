import { Request } from 'express';
import { AuthUser } from './auth';

export { AuthUser };

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface SocketUser {
  userId: number;
  socketId: string;
  connectedAt: Date;
}
