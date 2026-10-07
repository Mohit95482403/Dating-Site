import { Response, CookieOptions } from 'express';
import config from '../config/env';

export const REFRESH_COOKIE_NAME = 'connectly_refresh_token';

const getCookieOptions = (): CookieOptions => {
  const isProduction = config.env.isProduction;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

export class CookieUtil {
  /**
   * Set secure HTTP-only refresh token cookie
   */
  public static setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
  }

  /**
   * Clear refresh token cookie on logout
   */
  public static clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...getCookieOptions(),
      maxAge: 0,
    });
  }
}

export default CookieUtil;
