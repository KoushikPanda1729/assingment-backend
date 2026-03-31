import { Router } from 'express'
import type { RequestHandler } from 'express'
import { VideoController } from '../controllers/VideoController'
import { VideoService } from '../services/VideoService'
import { VideoRepository } from '../repositories/VideoRepository'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/auth.middleware'
import { upload } from '../config/multer'

// Dependency injection
const videoRepo = new VideoRepository()
const videoService = new VideoService(videoRepo)
const videoController = new VideoController(videoService)

const router = Router()

// All video routes require authentication
router.use(authenticate as unknown as RequestHandler)

// Stats
router.get('/stats', videoController.getStats as unknown as RequestHandler)

// List videos (with optional ?status=safe&search=keyword)
router.get('/', videoController.getAll as unknown as RequestHandler)

// Get single video metadata
router.get('/:id', videoController.getById as unknown as RequestHandler)

// Stream video — authenticated, ownership verified inside controller
router.get('/:id/stream', videoController.stream as unknown as RequestHandler)

// Thumbnail — authenticated
router.get('/:id/thumbnail', videoController.thumbnail as unknown as RequestHandler)

// Upload — editor and admin only
router.post(
  '/upload',
  authorize('editor', 'admin') as unknown as RequestHandler,
  upload.single('video'),
  videoController.upload as unknown as RequestHandler
)

// Update title/description — owner or admin
router.patch('/:id', videoController.update as unknown as RequestHandler)

// Delete — owner or admin
router.delete('/:id', videoController.delete as unknown as RequestHandler)

export default router
