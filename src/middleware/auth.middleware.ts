import type { Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'
import { UserRepository } from '../repositories/UserRepository'
import { getTokensFromCookies } from '../utils/cookie'
import type { AuthRequest, UserRole } from '../types'

const authService = new AuthService(new UserRepository())

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const { accessToken: token } = getTokensFromCookies(
    req.cookies as Record<string, string | undefined>
  )

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' })
    return
  }

  try {
    const payload = authService.verifyAccessToken(token)
    req.user = { id: payload.id, role: payload.role }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' })
      return
    }
    next()
  }
}
