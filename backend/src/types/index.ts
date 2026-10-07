// Connectly Backend Core Domain Types Index

export * from './user.types';
export * from './profile.types';
export * from './matching.types';
export * from './chat.types';
export * from './notification.types';
export * from './audit.types';
export * from './request.types';
export * from './auth';



// API Response Standard Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
  database?: string;
  tablesCount?: number;
  error?: string;
}
