import type { Response } from 'express'
import { UserController } from '../../controllers/UserController'
import { UserRepository } from '../../repositories/UserRepository'
import * as SocketServiceModule from '../../services/SocketService'
import type { IUser } from '../../models/User'
import type { AuthRequest } from '../../types'

jest.mock('../../repositories/UserRepository')
jest.mock('../../services/SocketService')

const mockUserRepo = jest.mocked(new UserRepository())
const mockEmitToUser = jest.fn()

const mockUser = {
  _id: 'user456',
  name: 'Other User',
  email: 'other@example.com',
  role: 'viewer' as const,
  createdAt: new Date(),
} as unknown as IUser

function makeRes(): jest.Mocked<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>
}

function makeReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    user: { id: 'admin123', role: 'admin' as const },
    body: {},
    params: {},
    ...overrides,
  } as unknown as AuthRequest
}

describe('UserController', () => {
  let controller: UserController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new UserController(mockUserRepo)
    jest.spyOn(SocketServiceModule, 'getSocketService').mockReturnValue({
      emitToUser: mockEmitToUser,
      emitToAll: jest.fn(),
    } as unknown as SocketServiceModule.SocketService)
  })

  describe('getAll', () => {
    it('should return all users', async () => {
      jest.mocked(mockUserRepo.findAll).mockResolvedValue([mockUser])
      const req = makeReq()
      const res = makeRes()

      await controller.getAll(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ user: undefined })
      const res = makeRes()

      await controller.getAll(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('updateRole', () => {
    it('should update user role and emit socket event', async () => {
      jest.mocked(mockUserRepo.updateRole).mockResolvedValue(mockUser)
      const req = makeReq({ params: { id: 'user456' }, body: { role: 'editor' } })
      const res = makeRes()

      await controller.updateRole(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockEmitToUser).toHaveBeenCalledWith('user456', 'user:role-changed', {
        role: 'editor',
      })
    })

    it('should return 400 for invalid role', async () => {
      const req = makeReq({ params: { id: 'user456' }, body: { role: 'superadmin' } })
      const res = makeRes()

      await controller.updateRole(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if trying to change own role', async () => {
      const req = makeReq({ params: { id: 'admin123' }, body: { role: 'viewer' } })
      const res = makeRes()

      await controller.updateRole(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if user not found', async () => {
      jest.mocked(mockUserRepo.updateRole).mockResolvedValue(null)
      const req = makeReq({ params: { id: 'nonexistent' }, body: { role: 'editor' } })
      const res = makeRes()

      await controller.updateRole(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('delete', () => {
    it('should delete user and emit socket event', async () => {
      jest.mocked(mockUserRepo.delete).mockResolvedValue(mockUser)
      const req = makeReq({ params: { id: 'user456' } })
      const res = makeRes()

      await controller.delete(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockEmitToUser).toHaveBeenCalledWith('user456', 'user:deleted', {})
    })

    it('should return 400 if trying to delete own account', async () => {
      const req = makeReq({ params: { id: 'admin123' } })
      const res = makeRes()

      await controller.delete(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if user not found', async () => {
      jest.mocked(mockUserRepo.delete).mockResolvedValue(null)
      const req = makeReq({ params: { id: 'nonexistent' } })
      const res = makeRes()

      await controller.delete(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})
