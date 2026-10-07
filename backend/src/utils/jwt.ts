import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env';
import { UserRole } from '../types/user.types';

export interface TokenPayload {
  userId: number;
  role: UserRole;
  email?: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {
  iat: number;
  exp: number;
}

export class JwtUtil {
  /**
   * Generate short-lived JWT Access Token
   */
  public static generateAccessToken(payload: TokenPayload, expiresIn?: string): string {
    const options: SignOptions = {
      expiresIn: (expiresIn || config.env.jwt.expiresIn) as any,
    };
    return jwt.sign(
      {
        userId: payload.userId,
        role: payload.role,
        ...(payload.email ? { email: payload.email } : {}),
      },
      config.env.jwt.secret,
      options
    );
  }

  /**
   * Verify and decode JWT Access Token
   */
  public static verifyAccessToken(token: string): DecodedToken {
    return jwt.verify(token, config.env.jwt.secret) as DecodedToken;
  }

  /**
   * Generate long-lived JWT Refresh Token
   */
  public static generateRefreshToken(payload: TokenPayload, expiresIn?: string): string {
    const options: SignOptions = {
      expiresIn: (expiresIn || config.env.jwt.refreshExpiresIn) as any,
    };
    return jwt.sign(
      {
        userId: payload.userId,
        role: payload.role,
      },
      config.env.jwt.refreshSecret,
      options
    );
  }

  /**
   * Verify and decode JWT Refresh Token
   */
  public static verifyRefreshToken(token: string): DecodedToken {
    return jwt.verify(token, config.env.jwt.refreshSecret) as DecodedToken;
  }

  /**
   * Securely hash a token using SHA-256 for deterministic database session lookups
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export default JwtUtil;
