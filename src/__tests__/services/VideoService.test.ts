import fs from 'fs'
import { VideoService } from '../../services/VideoService'
import { VideoRepository } from '../../repositories/VideoRepository'
import { ProcessingService } from '../../services/ProcessingService'
import type { IVideo } from '../../models/Video'
import { Types } from 'mongoose'

jest.mock('../../repositories/VideoRepository')
jest.mock('../../services/ProcessingService')
jest.mock('fs')

const mockVideoRepo = jest.mocked(new VideoRepository())

const mockVideo = {
  _id: new Types.ObjectId(),
  title: 'Test Video',
  description: 'desc',
  filename: 'uuid-file.mp4',
  originalName: 'test.mp4',
  mimetype: 'video/mp4',
  size: 1024,
  status: 'safe' as const,
  owner: new Types.ObjectId(),
  processingProgress: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as IVideo

describe('VideoService', () => {
  let service: VideoService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new VideoService(mockVideoRepo)
    jest.mocked(ProcessingService.prototype.process).mockResolvedValue()
  })

  describe('upload', () => {
    it('should create video record and trigger background processing', async () => {
      jest.mocked(mockVideoRepo.create).mockResolvedValue(mockVideo)

      const result = await service.upload({
        title: 'Test Video',
        description: 'desc',
        file: {
          filename: 'uuid.mp4',
          originalname: 'test.mp4',
          mimetype: 'video/mp4',
          size: 1024,
        } as Express.Multer.File,
        ownerId: '507f1f77bcf86cd799439011',
      })

      expect(mockVideoRepo.create).toHaveBeenCalled()
      expect(result).toBe(mockVideo)
    })
  })

  describe('getAll', () => {
    it('should filter by ownerId for editor role', async () => {
      jest.mocked(mockVideoRepo.findAll).mockResolvedValue([mockVideo])

      await service.getAll({}, 'editor', 'editor123')

      expect(mockVideoRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'editor123' })
      )
    })

    it('should not filter by owner for admin role', async () => {
      jest.mocked(mockVideoRepo.findAll).mockResolvedValue([mockVideo])

      await service.getAll({}, 'admin', 'admin123')

      expect(mockVideoRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: undefined })
      )
    })

    it('should not filter by owner for viewer role', async () => {
      jest.mocked(mockVideoRepo.findAll).mockResolvedValue([mockVideo])

      await service.getAll({}, 'viewer', 'viewer123')

      expect(mockVideoRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: undefined })
      )
    })
  })

  describe('getById', () => {
    it('should use findByIdAndOwner for editor', async () => {
      jest.mocked(mockVideoRepo.findByIdAndOwner).mockResolvedValue(mockVideo)

      const result = await service.getById('vid123', 'editor', 'owner123')

      expect(mockVideoRepo.findByIdAndOwner).toHaveBeenCalledWith('vid123', 'owner123')
      expect(result).toBe(mockVideo)
    })

    it('should use findById for admin', async () => {
      jest.mocked(mockVideoRepo.findById).mockResolvedValue(mockVideo)

      const result = await service.getById('vid123', 'admin', 'admin123')

      expect(mockVideoRepo.findById).toHaveBeenCalledWith('vid123')
      expect(result).toBe(mockVideo)
    })

    it('should throw if video not found', async () => {
      jest.mocked(mockVideoRepo.findById).mockResolvedValue(null)
      await expect(service.getById('bad', 'admin', 'admin123')).rejects.toThrow('Video not found')
    })
  })

  describe('update', () => {
    it('should update video metadata', async () => {
      jest.mocked(mockVideoRepo.findByIdAndOwner).mockResolvedValue(mockVideo)
      jest.mocked(mockVideoRepo.updateMetadata).mockResolvedValue(mockVideo)

      const result = await service.update('vid123', { title: 'New Title' }, 'editor', 'owner123')

      expect(mockVideoRepo.updateMetadata).toHaveBeenCalledWith('vid123', { title: 'New Title' })
      expect(result).toBe(mockVideo)
    })

    it('should throw if video not found', async () => {
      jest.mocked(mockVideoRepo.findByIdAndOwner).mockResolvedValue(null)
      await expect(service.update('bad', { title: 'T' }, 'editor', 'owner123')).rejects.toThrow(
        'Video not found'
      )
    })
  })

  describe('delete', () => {
    it('should delete file from disk and DB', async () => {
      jest.mocked(mockVideoRepo.findById).mockResolvedValue(mockVideo)
      jest.mocked(fs.existsSync).mockReturnValue(true)
      jest.mocked(fs.unlinkSync).mockReturnValue()
      jest.mocked(mockVideoRepo.delete).mockResolvedValue(mockVideo)

      await service.delete('vid123', 'admin', 'admin123')

      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(mockVideoRepo.delete).toHaveBeenCalledWith('vid123')
    })

    it('should skip file deletion if file does not exist', async () => {
      jest.mocked(mockVideoRepo.findById).mockResolvedValue(mockVideo)
      jest.mocked(fs.existsSync).mockReturnValue(false)
      jest.mocked(mockVideoRepo.delete).mockResolvedValue(mockVideo)

      await service.delete('vid123', 'admin', 'admin123')

      expect(fs.unlinkSync).not.toHaveBeenCalled()
    })

    it('should throw if video not found', async () => {
      jest.mocked(mockVideoRepo.findById).mockResolvedValue(null)
      await expect(service.delete('bad', 'admin', 'admin123')).rejects.toThrow('Video not found')
    })
  })

  describe('getStats', () => {
    it('should call countByOwner for editor', async () => {
      jest
        .mocked(mockVideoRepo.countByOwner)
        .mockResolvedValue({ total: 5, safe: 3, flagged: 1, processing: 1 })

      await service.getStats('editor', 'editor123')

      expect(mockVideoRepo.countByOwner).toHaveBeenCalledWith('editor123')
    })

    it('should call countAll for admin', async () => {
      jest
        .mocked(mockVideoRepo.countAll)
        .mockResolvedValue({ total: 100, safe: 80, flagged: 10, processing: 10 })

      await service.getStats('admin', 'admin123')

      expect(mockVideoRepo.countAll).toHaveBeenCalled()
    })
  })

  describe('getStreamData', () => {
    it('should return filePath and fileSize', () => {
      jest.mocked(fs.existsSync).mockReturnValue(true)
      jest.mocked(fs.statSync).mockReturnValue({ size: 2048 } as fs.Stats)

      const result = service.getStreamData('uuid.mp4')

      expect(result.fileSize).toBe(2048)
      expect(result.filePath).toContain('uuid.mp4')
    })

    it('should throw if file does not exist', () => {
      jest.mocked(fs.existsSync).mockReturnValue(false)
      expect(() => service.getStreamData('missing.mp4')).toThrow('Video file not found')
    })
  })
})
