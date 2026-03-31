import type { Response, NextFunction } from 'express'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { AuthService } from '../../services/AuthService'
import type { AuthRequest } from '../../types'

jest.mock('../../services/AuthService')
jest.mock('../../repositories/UserRepository')

function makeRes(): jest.Mocked<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>
}

describe('authenticate middleware', () => {
  const next = jest.fn() as NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(AuthService.prototype.verifyAccessToken)
      .mockReturnValue({ id: 'user123', role: 'viewer' })
  })

  it('should call next and set req.user for valid token', () => {
    const req = { cookies: { access_token: 'valid_token' } } as unknown as AuthRequest
    const res = makeRes()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual({ id: 'user123', role: 'viewer' })
  })

  it('should return 401 if no token in cookies', () => {
    const req = { cookies: {} } as unknown as AuthRequest
    const res = makeRes()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 401 for invalid token', () => {
    jest.mocked(AuthService.prototype.verifyAccessToken).mockImplementation(() => {
      throw new Error('invalid')
    })
    const req = { cookies: { access_token: 'bad_token' } } as unknown as AuthRequest
    const res = makeRes()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('authorize middleware', () => {
  const next = jest.fn() as NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call next if role is allowed', () => {
    const req = { user: { id: 'u1', role: 'admin' as const } } as AuthRequest
    const res = makeRes()

    authorize('admin', 'editor')(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should return 403 if role is not allowed', () => {
    const req = { user: { id: 'u1', role: 'viewer' as const } } as AuthRequest
    const res = makeRes()

    authorize('admin', 'editor')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 401 if no user', () => {
    const req = {} as AuthRequest
    const res = makeRes()

    authorize('admin')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
