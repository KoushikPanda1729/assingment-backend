import { Router, type Request, type Response } from 'express'
import passport from '../config/passport'
import { AuthController } from '../controllers/AuthController'
import { AuthService } from '../services/AuthService'
import { UserRepository } from '../repositories/UserRepository'
import { authenticate } from '../middleware/auth.middleware'
import type { RequestHandler } from 'express'
import type { IUser } from '../models/User'
import config from '../config/index'
import { setAuthCookies } from '../utils/cookie'

// Dependency injection wiring
const userRepo = new UserRepository()
const authService = new AuthService(userRepo)
const authController = new AuthController(authService)

const router = Router()

// Email/password routes
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post(
  '/logout',
  authenticate as unknown as RequestHandler,
  authController.logout as unknown as RequestHandler
)
router.get(
  '/me',
  authenticate as unknown as RequestHandler,
  authController.me as unknown as RequestHandler
)

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/login?error=google_failed`,
  }),
  async (req: Request, res: Response) => {
    const user = req.user as IUser
    const tokens = await authService.issueTokensForOAuthUser(user)

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken)

    res.redirect(
      `${config.clientUrl}/auth/callback?id=${String(user._id)}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}`
    )
  }
)

export default router
