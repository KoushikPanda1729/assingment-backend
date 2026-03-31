import type { Response } from 'express'
import config from '../config/index'

const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'

const BASE_OPTIONS = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax' as const,
  path: '/',
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...BASE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  })
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...BASE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' })
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
}

export function getTokensFromCookies(cookies: Record<string, string | undefined>): {
  accessToken: string | undefined
  refreshToken: string | undefined
} {
  return {
    accessToken: cookies[ACCESS_COOKIE],
    refreshToken: cookies[REFRESH_COOKIE],
  }
}
