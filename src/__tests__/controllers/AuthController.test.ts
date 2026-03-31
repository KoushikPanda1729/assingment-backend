import type { Request, Response } from 'express'
import { AuthController } from '../../controllers/AuthController'
import { AuthService } from '../../services/AuthService'
import type { IUser } from '../../models/User'
import type { AuthRequest } from '../../types'

jest.mock('../../services/AuthService')
jest.mock('../../utils/cookie', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
  getTokensFromCookies: jest.fn((cookies: Record<string, string | undefined>) => ({
    accessToken: cookies['access_token'],
    refreshToken: cookies['refresh_token'],
  })),
}))

const mockAuthService = jest.mocked(new AuthService({} as never))

const mockUser = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'viewer' as const,
  createdAt: new Date(),
} as unknown as IUser

const mockTokens = { accessToken: 'access', refreshToken: 'refresh' }

function makeRes(): jest.Mocked<Response> {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>
  return res
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthController(mockAuthService)
  })

  describe('register', () => {
    it('should register user and return 201', async () => {
      jest
        .mocked(mockAuthService.register)
        .mockResolvedValue({ user: mockUser, tokens: mockTokens })
      const req = {
        body: { name: 'Test', email: 'test@example.com', password: 'pass123' },
      } as Request
      const res = makeRes()

      await controller.register(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('should return 400 if fields missing', async () => {
      const req = { body: { name: 'Test' } } as Request
      const res = makeRes()

      await controller.register(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 409 if email already registered', async () => {
      jest.mocked(mockAuthService.register).mockRejectedValue(new Error('Email already registered'))
      const req = { body: { name: 'T', email: 'test@example.com', password: 'pass' } } as Request
      const res = makeRes()

      await controller.register(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('login', () => {
    it('should login and return 200', async () => {
      jest.mocked(mockAuthService.login).mockResolvedValue({ user: mockUser, tokens: mockTokens })
      const req = { body: { email: 'test@example.com', password: 'pass123' } } as Request
      const res = makeRes()

      await controller.login(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('should return 400 if fields missing', async () => {
      const req = { body: {} } as Request
      const res = makeRes()

      await controller.login(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 401 on invalid credentials', async () => {
      jest.mocked(mockAuthService.login).mockRejectedValue(new Error('Invalid email or password'))
      const req = { body: { email: 'x@x.com', password: 'wrong' } } as Request
      const res = makeRes()

      await controller.login(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('refresh', () => {
    it('should return new tokens on valid refresh', async () => {
      jest.mocked(mockAuthService.refresh).mockResolvedValue({ user: mockUser, tokens: mockTokens })
      const req = { cookies: { refresh_token: 'valid_token' } } as unknown as unknown as Request
      const res = makeRes()

      await controller.refresh(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 401 if no refresh token', async () => {
      const req = { cookies: {} } as unknown as Request
      const res = makeRes()

      await controller.refresh(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 401 on invalid refresh token', async () => {
      jest
        .mocked(mockAuthService.refresh)
        .mockRejectedValue(new Error('Invalid or expired refresh token'))
      const req = { cookies: { refresh_token: 'bad' } } as unknown as Request
      const res = makeRes()

      await controller.refresh(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('me', () => {
    it('should return current user', async () => {
      jest.mocked(mockAuthService.findById).mockResolvedValue(mockUser)
      const req = { user: { id: 'user123', role: 'viewer' as const } } as AuthRequest
      const res = makeRes()

      await controller.me(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 401 if no user in request', async () => {
      const req = {} as AuthRequest
      const res = makeRes()

      await controller.me(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 401 if user not found in DB', async () => {
      jest.mocked(mockAuthService.findById).mockResolvedValue(null)
      const req = { user: { id: 'gone', role: 'viewer' as const } } as AuthRequest
      const res = makeRes()

      await controller.me(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('updateProfile', () => {
    it('should update profile and return 200', async () => {
      jest.mocked(mockAuthService.updateProfile).mockResolvedValue(mockUser)
      const req = {
        user: { id: 'user123', role: 'viewer' as const },
        body: { name: 'New Name' },
      } as AuthRequest
      const res = makeRes()

      await controller.updateProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 400 if nothing to update', async () => {
      const req = { user: { id: 'user123', role: 'viewer' as const }, body: {} } as AuthRequest
      const res = makeRes()

      await controller.updateProfile(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('changePassword', () => {
    it('should change password and return 200', async () => {
      jest.mocked(mockAuthService.changePassword).mockResolvedValue()
      const req = {
        user: { id: 'user123', role: 'viewer' as const },
        body: { currentPassword: 'old', newPassword: 'newpass' },
      } as AuthRequest
      const res = makeRes()

      await controller.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 400 if fields missing', async () => {
      const req = { user: { id: 'u', role: 'viewer' as const }, body: {} } as AuthRequest
      const res = makeRes()

      await controller.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if new password too short', async () => {
      const req = {
        user: { id: 'u', role: 'viewer' as const },
        body: { currentPassword: 'old', newPassword: 'abc' },
      } as AuthRequest
      const res = makeRes()

      await controller.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if current password incorrect', async () => {
      jest
        .mocked(mockAuthService.changePassword)
        .mockRejectedValue(new Error('Current password is incorrect'))
      const req = {
        user: { id: 'u', role: 'viewer' as const },
        body: { currentPassword: 'wrong', newPassword: 'newpass' },
      } as AuthRequest
      const res = makeRes()

      await controller.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('logout', () => {
    it('should logout and return 200', async () => {
      jest.mocked(mockAuthService.logout).mockResolvedValue()
      const req = { user: { id: 'user123', role: 'viewer' as const } } as AuthRequest
      const res = makeRes()

      await controller.logout(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockAuthService.logout).toHaveBeenCalledWith('user123')
    })
  })

  describe('updateProfile error paths', () => {
    it('should return 401 if no user', async () => {
      const req = { user: undefined, body: { name: 'X' } } as unknown as AuthRequest
      const res = makeRes()
      await controller.updateProfile(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 if user not found', async () => {
      jest.mocked(mockAuthService.updateProfile).mockResolvedValue(null)
      const req = { user: { id: 'u', role: 'viewer' as const }, body: { name: 'X' } } as AuthRequest
      const res = makeRes()
      await controller.updateProfile(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('me error paths', () => {
    it('should return 500 on unexpected error', async () => {
      jest.mocked(mockAuthService.findById).mockRejectedValue(new Error('DB down'))
      const req = { user: { id: 'u', role: 'viewer' as const } } as AuthRequest
      const res = makeRes()
      await controller.me(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
