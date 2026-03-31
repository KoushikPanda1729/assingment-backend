import type { Response } from 'express'
import { VideoController } from '../../controllers/VideoController'
import { VideoService } from '../../services/VideoService'
import type { IVideo } from '../../models/Video'
import type { AuthRequest } from '../../types'
import { Types } from 'mongoose'

jest.mock('../../services/VideoService')
jest.mock('fs')

const mockVideoService = jest.mocked(new VideoService({} as never))

const mockVideo = {
  _id: new Types.ObjectId(),
  title: 'Test Video',
  description: 'desc',
  filename: 'uuid.mp4',
  originalName: 'test.mp4',
  mimetype: 'video/mp4',
  size: 1024,
  status: 'safe' as const,
  owner: new Types.ObjectId(),
  processingProgress: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as IVideo

function makeRes(): jest.Mocked<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    writeHead: jest.fn(),
    setHeader: jest.fn(),
    headersSent: false,
  } as unknown as jest.Mocked<Response>
}

function makeReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    user: { id: 'user123', role: 'viewer' as const },
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthRequest
}

describe('VideoController', () => {
  let controller: VideoController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new VideoController(mockVideoService)
  })

  describe('upload', () => {
    it('should upload video and return 201', async () => {
      jest.mocked(mockVideoService.upload).mockResolvedValue(mockVideo)
      const req = makeReq({
        file: {
          filename: 'uuid.mp4',
          originalname: 'test.mp4',
          mimetype: 'video/mp4',
          size: 1024,
        } as Express.Multer.File,
        body: { title: 'Test Video' },
      })
      const res = makeRes()

      await controller.upload(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ user: undefined })
      const res = makeRes()

      await controller.upload(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 if no file', async () => {
      const req = makeReq({ body: { title: 'Test' } })
      const res = makeRes()

      await controller.upload(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 if no title', async () => {
      const req = makeReq({
        file: { filename: 'f.mp4' } as Express.Multer.File,
        body: {},
      })
      const res = makeRes()

      await controller.upload(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('getAll', () => {
    it('should return all videos with count', async () => {
      jest.mocked(mockVideoService.getAll).mockResolvedValue([mockVideo])
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

  describe('getById', () => {
    it('should return video by id', async () => {
      jest.mocked(mockVideoService.getById).mockResolvedValue(mockVideo)
      const req = makeReq({ params: { id: 'vid123' } })
      const res = makeRes()

      await controller.getById(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 404 if video not found', async () => {
      jest.mocked(mockVideoService.getById).mockRejectedValue(new Error('Video not found'))
      const req = makeReq({ params: { id: 'bad' } })
      const res = makeRes()

      await controller.getById(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('should update video and return 200', async () => {
      jest.mocked(mockVideoService.update).mockResolvedValue(mockVideo)
      const req = makeReq({ params: { id: 'vid123' }, body: { title: 'New Title' } })
      const res = makeRes()

      await controller.update(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 400 if title missing', async () => {
      const req = makeReq({ params: { id: 'vid123' }, body: {} })
      const res = makeRes()

      await controller.update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 if video not found', async () => {
      jest.mocked(mockVideoService.update).mockRejectedValue(new Error('Video not found'))
      const req = makeReq({ params: { id: 'bad' }, body: { title: 'T' } })
      const res = makeRes()

      await controller.update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('delete', () => {
    it('should delete video and return 200', async () => {
      jest.mocked(mockVideoService.delete).mockResolvedValue()
      const req = makeReq({ params: { id: 'vid123' } })
      const res = makeRes()

      await controller.delete(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 404 if video not found', async () => {
      jest.mocked(mockVideoService.delete).mockRejectedValue(new Error('Video not found'))
      const req = makeReq({ params: { id: 'bad' } })
      const res = makeRes()

      await controller.delete(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('getStats', () => {
    it('should return stats', async () => {
      jest
        .mocked(mockVideoService.getStats)
        .mockResolvedValue({ total: 5, safe: 3, flagged: 1, processing: 1 })
      const req = makeReq()
      const res = makeRes()

      await controller.getStats(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('stream', () => {
    it('should stream video without range header', async () => {
      jest.mocked(mockVideoService.getById).mockResolvedValue(mockVideo)
      jest
        .mocked(mockVideoService.getStreamData)
        .mockReturnValue({ filePath: '/path/uuid.mp4', fileSize: 2048 })
      const req = makeReq({ params: { id: 'vid123' }, headers: {} })
      const res = {
        ...makeRes(),
        writeHead: jest.fn(),
        pipe: jest.fn(),
      } as unknown as jest.Mocked<Response>

      await controller.stream(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object))
    })

    it('should return 400 if video is still processing', async () => {
      const processingVideo = { ...mockVideo, status: 'processing' as const } as unknown as IVideo
      jest.mocked(mockVideoService.getById).mockResolvedValue(processingVideo)
      const req = makeReq({ params: { id: 'vid123' } })
      const res = makeRes()

      await controller.stream(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should stream with range header (206)', async () => {
      jest.mocked(mockVideoService.getById).mockResolvedValue(mockVideo)
      jest
        .mocked(mockVideoService.getStreamData)
        .mockReturnValue({ filePath: '/path/uuid.mp4', fileSize: 10000 })
      const req = makeReq({ params: { id: 'vid123' }, headers: { range: 'bytes=0-999' } })
      const res = {
        ...makeRes(),
        writeHead: jest.fn(),
      } as unknown as jest.Mocked<Response>

      await controller.stream(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(206, expect.any(Object))
    })
  })
})
