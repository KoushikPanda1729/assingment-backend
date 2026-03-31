import fs from 'fs'
import { VideoRepository } from '../repositories/VideoRepository'
import { ThumbnailService } from './ThumbnailService'
import { getSocketService } from './SocketService'
import { logger } from '../utils/logger'

export class ProcessingService {
  private readonly thumbnailService = new ThumbnailService()

  constructor(private readonly videoRepo: VideoRepository) {}

  async process(videoId: string, ownerId: string, filePath: string): Promise<void> {
    const socket = getSocketService()

    try {
      // Step 1 — mark as processing
      await this.videoRepo.updateStatus(videoId, 'processing', { processingProgress: 0 })
      socket.emitToUser(ownerId, 'video:processing-start', { videoId, progress: 0 })

      const fileStats = fs.statSync(filePath)
      const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2)
      logger.info(`Processing video ${videoId} (${fileSizeMB}MB)`)

      // Step 2 — extract real metadata (duration, resolution) + generate thumbnail
      await this.delay(this.randomDelay(500, 1000))
      const [metadata, thumbnailFilename] = await Promise.all([
        this.thumbnailService.getVideoMetadata(filePath),
        this.thumbnailService.generate(filePath).catch((err) => {
          logger.warn(`Thumbnail generation skipped: ${(err as Error).message}`)
          return undefined
        }),
      ])

      // Save thumbnail and metadata
      if (thumbnailFilename) {
        await this.videoRepo.updateThumbnail(videoId, thumbnailFilename)
      }

      await this.videoRepo.updateProgress(videoId, 20)
      socket.emitToUser(ownerId, 'video:progress', { videoId, progress: 20 })
      logger.info(`Video ${videoId} progress: 20%`)

      // Step 3 — simulate analysis with progress updates
      const progressSteps = [40, 60, 80]
      for (const progress of progressSteps) {
        await this.delay(this.randomDelay(1500, 3000))
        await this.videoRepo.updateProgress(videoId, progress)
        socket.emitToUser(ownerId, 'video:progress', { videoId, progress })
        logger.info(`Video ${videoId} progress: ${progress}%`)
      }

      // Step 4 — determine sensitivity result
      // Simulated: 70% safe, 30% flagged
      // Replace with real ML model (e.g. Google Video Intelligence API)
      const sensitivityScore = Math.floor(Math.random() * 100)
      const status = sensitivityScore > 30 ? 'safe' : 'flagged'

      // Step 5 — save final status with metadata
      await this.videoRepo.updateStatus(videoId, status, {
        sensitivityScore,
        processingProgress: 100,
        duration: metadata.duration,
        resolution: metadata.resolution,
      })

      socket.emitToUser(ownerId, 'video:processing-done', {
        videoId,
        status,
        sensitivityScore,
        progress: 100,
      })

      logger.info(`Video ${videoId} processing complete: ${status} (score: ${sensitivityScore})`)
    } catch (error) {
      logger.error(`Processing failed for video ${videoId}:`, error)
      await this.videoRepo.updateStatus(videoId, 'pending', { processingProgress: 0 })
      socket.emitToUser(ownerId, 'video:processing-error', {
        videoId,
        message: 'Processing failed, please try again',
      })
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
