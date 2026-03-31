import fs from 'fs'
import { ProcessingService } from '../../services/ProcessingService'
import { VideoRepository } from '../../repositories/VideoRepository'
import { ThumbnailService } from '../../services/ThumbnailService'
import * as SocketServiceModule from '../../services/SocketService'

jest.mock('../../repositories/VideoRepository')
jest.mock('../../services/ThumbnailService')
jest.mock('fs')
jest.mock('../../services/SocketService')

const mockVideoRepo = jest.mocked(new VideoRepository())
const mockEmitToUser = jest.fn()

describe('ProcessingService', () => {
  let service: ProcessingService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ProcessingService(mockVideoRepo)
    jest.spyOn(SocketServiceModule, 'getSocketService').mockReturnValue({
      emitToUser: mockEmitToUser,
      emitToAll: jest.fn(),
    } as unknown as SocketServiceModule.SocketService)
    jest.mocked(fs.statSync).mockReturnValue({ size: 1024 * 1024 } as fs.Stats)
    jest.mocked(mockVideoRepo.updateStatus).mockResolvedValue(null)
    jest.mocked(mockVideoRepo.updateProgress).mockResolvedValue()
    jest.mocked(mockVideoRepo.updateThumbnail).mockResolvedValue()
    jest
      .mocked(ThumbnailService.prototype.getVideoMetadata)
      .mockResolvedValue({ duration: 30, resolution: '1280x720' })
    jest.mocked(ThumbnailService.prototype.generate).mockResolvedValue('thumb.jpg')
    // Speed up delays
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      ;(fn as () => void)()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })
  })

  it('should process video through all steps and emit events', async () => {
    await service.process('vid123', 'owner123', '/uploads/file.mp4')

    expect(mockVideoRepo.updateStatus).toHaveBeenCalledWith('vid123', 'processing', {
      processingProgress: 0,
    })
    expect(mockEmitToUser).toHaveBeenCalledWith(
      'owner123',
      'video:processing-start',
      expect.any(Object)
    )
    expect(mockVideoRepo.updateThumbnail).toHaveBeenCalledWith('vid123', 'thumb.jpg')
    expect(mockEmitToUser).toHaveBeenCalledWith(
      'owner123',
      'video:processing-done',
      expect.any(Object)
    )
  })

  it('should skip thumbnail if generation fails', async () => {
    jest
      .mocked(ThumbnailService.prototype.generate)
      .mockRejectedValue(new Error('ffmpeg not found'))

    await service.process('vid123', 'owner123', '/uploads/file.mp4')

    expect(mockVideoRepo.updateThumbnail).not.toHaveBeenCalled()
    expect(mockEmitToUser).toHaveBeenCalledWith(
      'owner123',
      'video:processing-done',
      expect.any(Object)
    )
  })

  it('should revert to pending and emit error on failure', async () => {
    jest.mocked(mockVideoRepo.updateStatus).mockRejectedValueOnce(new Error('DB error'))

    await service.process('vid123', 'owner123', '/uploads/file.mp4')

    expect(mockVideoRepo.updateStatus).toHaveBeenCalledWith('vid123', 'pending', {
      processingProgress: 0,
    })
    expect(mockEmitToUser).toHaveBeenCalledWith(
      'owner123',
      'video:processing-error',
      expect.any(Object)
    )
  })
})
