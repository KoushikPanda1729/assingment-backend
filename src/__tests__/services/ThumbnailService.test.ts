import { ThumbnailService } from '../../services/ThumbnailService'
import ffmpegLib from 'fluent-ffmpeg'

const ffmpegMocked = ffmpegLib as unknown as jest.Mock & { ffprobe: jest.Mock }

jest.mock('fluent-ffmpeg', () => {
  const screenshotsMock = jest.fn().mockReturnThis()
  const onMock = jest.fn().mockImplementation(function (
    this: unknown,
    event: string,
    cb: () => void
  ) {
    if (event === 'end') cb()
    return this
  })
  const ffprobeStatic = jest.fn()
  const ffmpegMock = jest.fn().mockReturnValue({ screenshots: screenshotsMock, on: onMock })
  ;(ffmpegMock as unknown as Record<string, unknown>).ffprobe = ffprobeStatic
  return { default: ffmpegMock, __esModule: true }
})

jest.mock('../../__tests__/__mocks__/uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }))

describe('ThumbnailService', () => {
  let service: ThumbnailService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ThumbnailService()
  })

  describe('generate', () => {
    it('should generate a thumbnail and return filename', async () => {
      const result = await service.generate('/path/to/video.mp4')
      expect(result).toMatch(/\.jpg$/)
    })

    it('should reject on ffmpeg error', async () => {
      const onMock = jest.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: (err: Error) => void
      ) {
        if (event === 'error') cb(new Error('ffmpeg failed'))
        return this
      })
      ffmpegMocked.mockReturnValue({ screenshots: jest.fn().mockReturnThis(), on: onMock })

      await expect(service.generate('/bad/path.mp4')).rejects.toThrow('ffmpeg failed')
    })
  })

  describe('getVideoMetadata', () => {
    it('should return duration and resolution from ffprobe', async () => {
      ffmpegMocked.ffprobe.mockImplementation(
        (_path: string, cb: (err: null, data: unknown) => void) => {
          cb(null, {
            format: { duration: 30.5 },
            streams: [{ codec_type: 'video', width: 1280, height: 720 }],
          })
        }
      )

      const result = await service.getVideoMetadata('/path/video.mp4')

      expect(result.duration).toBe(31)
      expect(result.resolution).toBe('1280x720')
    })

    it('should return empty object on ffprobe error', async () => {
      ffmpegMocked.ffprobe.mockImplementation((_path: string, cb: (err: Error) => void) => {
        cb(new Error('probe failed'))
      })

      const result = await service.getVideoMetadata('/bad/path.mp4')

      expect(result).toEqual({})
    })

    it('should return undefined resolution if no video stream', async () => {
      ffmpegMocked.ffprobe.mockImplementation(
        (_path: string, cb: (err: null, data: unknown) => void) => {
          cb(null, { format: { duration: 10 }, streams: [{ codec_type: 'audio' }] })
        }
      )

      const result = await service.getVideoMetadata('/path/audio.mp4')

      expect(result.resolution).toBeUndefined()
    })
  })
})
