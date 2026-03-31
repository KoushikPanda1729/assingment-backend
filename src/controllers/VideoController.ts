import fs from 'fs'
import type { Response } from 'express'
import { VideoService } from '../services/VideoService'
import { logger } from '../utils/logger'
import type { AuthRequest } from '../types'
import type { IVideo, VideoStatus } from '../models/Video'

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  upload = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No video file provided' })
        return
      }

      const { title, description } = req.body as { title?: string; description?: string }
      if (!title?.trim()) {
        res.status(400).json({ success: false, message: 'Title is required' })
        return
      }

      const video = await this.videoService.upload({
        title: title.trim(),
        description: description?.trim(),
        file: req.file,
        ownerId: req.user.id,
      })

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully. Processing started.',
        data: { video: this.formatVideo(video) },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      logger.error('Upload error:', error)
      res.status(500).json({ success: false, message })
    }
  }

  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const rawStatus = req.query['status']
      const rawSearch = req.query['search']
      const status = (Array.isArray(rawStatus) ? rawStatus[0] : rawStatus) as
        | VideoStatus
        | 'all'
        | undefined
      const search = (Array.isArray(rawSearch) ? rawSearch[0] : rawSearch) as string | undefined

      const videos = await this.videoService.getAll({ status, search }, req.user.role, req.user.id)

      res.status(200).json({
        success: true,
        data: { videos: videos.map((v) => this.formatVideo(v)), count: videos.length },
      })
    } catch (error) {
      logger.error('GetAll error:', error)
      res.status(500).json({ success: false, message: 'Failed to fetch videos' })
    }
  }

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      const video = await this.videoService.getById(id, req.user.role, req.user.id)
      res.status(200).json({ success: true, data: { video: this.formatVideo(video) } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch video'
      res.status(message === 'Video not found' ? 404 : 500).json({ success: false, message })
    }
  }

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      const { title, description } = req.body as { title?: string; description?: string }
      if (!title?.trim()) {
        res.status(400).json({ success: false, message: 'Title is required' })
        return
      }
      const video = await this.videoService.update(
        id,
        { title: title.trim(), description: description?.trim() },
        req.user.role,
        req.user.id
      )
      res.status(200).json({ success: true, data: { video: this.formatVideo(video) } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update video'
      res.status(message === 'Video not found' ? 404 : 500).json({ success: false, message })
    }
  }

  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      await this.videoService.delete(id, req.user.role, req.user.id)
      res.status(200).json({ success: true, message: 'Video deleted successfully' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete video'
      res.status(message === 'Video not found' ? 404 : 500).json({ success: false, message })
    }
  }

  getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const stats = await this.videoService.getStats(req.user.role, req.user.id)
      res.status(200).json({ success: true, data: stats })
    } catch (error) {
      logger.error('Stats error:', error)
      res.status(500).json({ success: false, message: 'Failed to fetch stats' })
    }
  }

  stream = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      const video = await this.videoService.getById(id, req.user.role, req.user.id)

      if (video.status !== 'safe' && video.status !== 'flagged') {
        res.status(400).json({ success: false, message: 'Video is still processing' })
        return
      }

      const { filePath, fileSize } = this.videoService.getStreamData(video.filename)
      const rangeHeader = req.headers.range

      if (!rangeHeader) {
        res.writeHead(200, {
          'Content-Type': video.mimetype,
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
        })
        fs.createReadStream(filePath).pipe(res)
        return
      }

      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(startStr ?? '0', 10)
      const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024, fileSize - 1)
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimetype,
      })

      fs.createReadStream(filePath, { start, end }).pipe(res)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Streaming failed'
      logger.error('Stream error:', error)
      if (!res.headersSent) {
        res.status(message === 'Video not found' ? 404 : 500).json({ success: false, message })
      }
    }
  }

  thumbnail = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const id = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? '')
      const video = await this.videoService.getById(id, req.user.role, req.user.id)

      if (!video.thumbnail) {
        res.status(404).json({ success: false, message: 'No thumbnail' })
        return
      }

      const { filePath } = this.videoService.getStreamData(video.thumbnail)
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      const fs = await import('fs')
      fs.createReadStream(filePath).pipe(res)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch thumbnail'
      if (!res.headersSent) res.status(404).json({ success: false, message })
    }
  }

  private formatVideo(video: IVideo) {
    return {
      id: String(video._id),
      title: video.title,
      description: video.description,
      originalName: video.originalName,
      mimetype: video.mimetype,
      size: video.size,
      duration: video.duration,
      resolution: video.resolution,
      thumbnail: video.thumbnail ? true : false, // just a flag — actual image served via /thumbnail endpoint
      status: video.status,
      sensitivityScore: video.sensitivityScore,
      processingProgress: video.processingProgress,
      owner: video.owner,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    }
  }
}
