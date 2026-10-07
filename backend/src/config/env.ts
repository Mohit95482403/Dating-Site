import dotenv from 'dotenv';
import path from 'path';

// Load .env configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cors: {
    frontendUrl: string;
    allowedOrigins: string[];
  };
}

const validateEnv = (): void => {
  const requiredEnvVars = ['JWT_SECRET'];
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Missing mandatory environment variables: ${missing.join(', ')}. Please check your .env file.`
    );
  }
};

validateEnv();

const normalizeOrigin = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
};

const frontendUrl =
  normalizeOrigin(process.env.FRONTEND_URL) ||
  normalizeOrigin(process.env.CLIENT_URL) ||
  'https://connectly.mohitsonawane425.workers.dev';

// Build allowed origins from environment + defaults
const buildAllowedOrigins = (): string[] => {
  const origins = new Set<string>();

  // 1. Mandatory production Cloudflare frontend origin
  origins.add('https://connectly.mohitsonawane425.workers.dev');

  // 2. Primary frontend URL from environment
  if (frontendUrl) origins.add(frontendUrl);

  // 3. Include any extra origins from ALLOWED_ORIGINS env var (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
      const trimmed = normalizeOrigin(o);
      if (trimmed) origins.add(trimmed);
    });
  }

  // 4. Include CLIENT_URL and CORS_ORIGIN if set separately
  if (process.env.CLIENT_URL) origins.add(normalizeOrigin(process.env.CLIENT_URL));
  if (process.env.CORS_ORIGIN) origins.add(normalizeOrigin(process.env.CORS_ORIGIN));

  // 5. Development origins (always permitted for local dev & testing)
  origins.add('http://localhost:5173');
  origins.add('http://127.0.0.1:5173');
  origins.add('http://localhost:3000');
  origins.add('http://127.0.0.1:3000');

  return Array.from(origins).filter(Boolean);
};

export const config: { env: Config } = {
  env: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      name: process.env.DB_NAME || 'connectly',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'connectly_default_dev_secret_change_in_production',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'connectly_default_dev_refresh_secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    cors: {
      frontendUrl,
      allowedOrigins: buildAllowedOrigins(),
    },
  },
};

export default config;
