import { Router } from 'express'
import type { RequestHandler } from 'express'
import { UserController } from '../controllers/UserController'
import { UserRepository } from '../repositories/UserRepository'
import { authenticate, authorize } from '../middleware/auth.middleware'

const userRepo = new UserRepository()
const userController = new UserController(userRepo)

const router = Router()

// All user management routes: authenticated + admin only
router.use(authenticate as unknown as RequestHandler)
router.use(authorize('admin') as unknown as RequestHandler)

router.get('/', userController.getAll as unknown as RequestHandler)
router.patch('/:id/role', userController.updateRole as unknown as RequestHandler)
router.delete('/:id', userController.delete as unknown as RequestHandler)

export default router
