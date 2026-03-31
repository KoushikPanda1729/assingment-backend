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
      // Fetch from DB so role changes are reflected immediately
      const user = await this.authService.findById(req.user.id)
      if (!user) {
        res.status(401).json({ success: false, message: 'User not found' })
        return
      }
      res.status(200).json({
        success: true,
        data: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      logger.error('Me error:', error)
      res.status(500).json({ success: false, message: 'Failed to get user' })
    }
  }

  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const { name, email } = req.body as { name?: string; email?: string }
      if (!name?.trim() && !email?.trim()) {
        res.status(400).json({ success: false, message: 'Nothing to update' })
        return
      }
      const user = await this.authService.updateProfile(req.user.id, {
        ...(name?.trim() && { name: name.trim() }),
        ...(email?.trim() && { email: email.trim() }),
      })
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' })
        return
      }
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
      logger.error('UpdateProfile error:', error)
      res.status(500).json({ success: false, message: 'Failed to update profile' })
    }
  }

  changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string
        newPassword?: string
      }
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required' })
        return
      }
      if (newPassword.length < 6) {
        res
          .status(400)
          .json({ success: false, message: 'New password must be at least 6 characters' })
        return
      }
      await this.authService.changePassword(req.user.id, currentPassword, newPassword)
      res.status(200).json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password'
      logger.error('ChangePassword error:', error)
      res
        .status(message === 'Current password is incorrect' ? 400 : 500)
        .json({ success: false, message })
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
