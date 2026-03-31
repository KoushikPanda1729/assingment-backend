import fs from 'fs'
import { Types } from 'mongoose'
import { VideoRepository, type VideoFilter } from '../repositories/VideoRepository'
import { ProcessingService } from './ProcessingService'
import { getUploadPath } from '../config/multer'
import { logger } from '../utils/logger'
import type { IVideo } from '../models/Video'
import type { UserRole } from '../types'

export class VideoService {
  private readonly processingService: ProcessingService

  constructor(private readonly videoRepo: VideoRepository) {
    this.processingService = new ProcessingService(videoRepo)
  }

  async upload(data: {
    title: string
    description?: string
    file: Express.Multer.File
    ownerId: string
  }): Promise<IVideo> {
    const video = await this.videoRepo.create({
      title: data.title,
      description: data.description,
      filename: data.file.filename,
      originalName: data.file.originalname,
      mimetype: data.file.mimetype,
      size: data.file.size,
      owner: new Types.ObjectId(data.ownerId),
    })

    const filePath = getUploadPath(data.file.filename)

    // Fire-and-forget — do not await, runs in background
    this.processingService.process(String(video._id), data.ownerId, filePath).catch((err) => {
      logger.error('Background processing error:', err)
    })

    return video
  }

  async getAll(filter: VideoFilter, role: UserRole, userId: string): Promise<IVideo[]> {
    // Admin and viewer see all videos; editor sees only their own
    const ownerId = role === 'editor' ? userId : undefined
    return this.videoRepo.findAll({ ...filter, ownerId })
  }

  async getById(id: string, role: UserRole, userId: string): Promise<IVideo> {
    const video =
      role === 'editor'
        ? await this.videoRepo.findByIdAndOwner(id, userId)
        : await this.videoRepo.findById(id)

    if (!video) throw new Error('Video not found')
    return video
  }

  async update(
    id: string,
    data: { title: string; description?: string },
    role: UserRole,
    userId: string
  ): Promise<IVideo> {
    const video =
      role === 'editor'
        ? await this.videoRepo.findByIdAndOwner(id, userId)
        : await this.videoRepo.findById(id)
    if (!video) throw new Error('Video not found')
    const updated = await this.videoRepo.updateMetadata(id, data)
    if (!updated) throw new Error('Video not found')
    return updated
  }

  async delete(id: string, role: UserRole, userId: string): Promise<void> {
    const video =
      role === 'editor'
        ? await this.videoRepo.findByIdAndOwner(id, userId)
        : await this.videoRepo.findById(id)

    if (!video) throw new Error('Video not found')

    // Delete file from disk
    const filePath = getUploadPath(video.filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      logger.info(`Deleted file: ${video.filename}`)
    }

    await this.videoRepo.delete(id)
  }

  async getStats(role: UserRole, userId: string) {
    return role === 'editor' ? this.videoRepo.countByOwner(userId) : this.videoRepo.countAll()
  }

  getStreamData(filename: string): { filePath: string; fileSize: number } {
    const filePath = getUploadPath(filename)
    if (!fs.existsSync(filePath)) throw new Error('Video file not found')
    const { size: fileSize } = fs.statSync(filePath)
    return { filePath, fileSize }
  }
}
