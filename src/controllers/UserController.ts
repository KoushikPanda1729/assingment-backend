import type { Response } from 'express'
import { UserRepository } from '../repositories/UserRepository'
import { logger } from '../utils/logger'
import type { AuthRequest } from '../types'
import type { UserRole } from '../types'
import { getSocketService } from '../services/SocketService'

export class UserController {
  constructor(private readonly userRepo: UserRepository) {}

  private formatUser(user: {
    _id: unknown
    name: string
    email: string
    role: UserRole
    createdAt: Date
  }) {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  }

  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const users = await this.userRepo.findAll()
      res.status(200).json({
        success: true,
        data: { users: users.map((u) => this.formatUser(u)), count: users.length },
      })
    } catch (error) {
      logger.error('GetAllUsers error:', error)
      res.status(500).json({ success: false, message: 'Failed to fetch users' })
    }
  }

  updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      const { role } = req.body as { role?: string }
      if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
        res.status(400).json({ success: false, message: 'Invalid role' })
        return
      }
      if (id === req.user.id) {
        res.status(400).json({ success: false, message: 'Cannot change your own role' })
        return
      }
      const user = await this.userRepo.updateRole(id, role as UserRole)
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' })
        return
      }
      // Notify affected user in real-time so their session updates immediately
      try {
        getSocketService().emitToUser(id, 'user:role-changed', { role })
      } catch {
        /* socket may not be initialized */
      }
      res.status(200).json({ success: true, data: { user: this.formatUser(user) } })
    } catch (error) {
      logger.error('UpdateRole error:', error)
      res.status(500).json({ success: false, message: 'Failed to update role' })
    }
  }

  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      if (id === req.user.id) {
        res.status(400).json({ success: false, message: 'Cannot delete your own account' })
        return
      }
      const user = await this.userRepo.delete(id)
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' })
        return
      }
      // Notify deleted user so their session is terminated immediately
      try {
        getSocketService().emitToUser(id, 'user:deleted', {})
      } catch {
        /* socket may not be initialized */
      }
      res.status(200).json({ success: true, message: 'User deleted successfully' })
    } catch (error) {
      logger.error('DeleteUser error:', error)
      res.status(500).json({ success: false, message: 'Failed to delete user' })
    }
  }
}
