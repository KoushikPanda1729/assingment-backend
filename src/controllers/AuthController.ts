import type { Request, Response } from 'express'
import { AuthService } from '../services/AuthService'
import { setAuthCookies, clearAuthCookies, getTokensFromCookies } from '../utils/cookie'
import { logger } from '../utils/logger'
import type { AuthRequest } from '../types'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body as {
        name: string
        email: string
        password: string
        role: string
      }

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email and password are required' })
        return
      }

      const { user, tokens } = await this.authService.register({
        name,
        email,
        password,
        role: (role as 'viewer' | 'editor' | 'admin') ?? 'viewer',
      })

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken)

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      logger.error('Register error:', error)
      res
        .status(message === 'Email already registered' ? 409 : 500)
        .json({ success: false, message })
    }
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string }

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' })
        return
      }

      const { user, tokens } = await this.authService.login(email, password)

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken)

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      logger.error('Login error:', error)
      res
        .status(message === 'Invalid email or password' ? 401 : 500)
        .json({ success: false, message })
    }
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = getTokensFromCookies(
        req.cookies as Record<string, string | undefined>
      )

      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'No refresh token' })
        return
      }

      const { user, tokens } = await this.authService.refresh(refreshToken)

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken)

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed'
      logger.error('Refresh error:', error)
      res.status(401).json({ success: false, message })
    }
  }

  me = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      res.status(200).json({ success: true, data: req.user })
    } catch (error) {
      logger.error('Me error:', error)
      res.status(500).json({ success: false, message: 'Failed to get user' })
    }
  }

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.id) {
        await this.authService.logout(req.user.id)
      }
      clearAuthCookies(res)
      res.status(200).json({ success: true, message: 'Logged out successfully' })
    } catch (error) {
      logger.error('Logout error:', error)
      res.status(500).json({ success: false, message: 'Logout failed' })
    }
  }
}
