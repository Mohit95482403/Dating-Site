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

const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

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
      allowedOrigins: [
        frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
    },
  },
};

export default config;
