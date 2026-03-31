import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getUploadPath } from '../config/multer'
import { logger } from '../utils/logger'

// Use system ffmpeg if available, otherwise fall back to npm installer
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const installer = require('@ffmpeg-installer/ffmpeg') as { path: string }
  if (!process.env['PATH']?.includes('ffmpeg')) ffmpeg.setFfmpegPath(installer.path)
} catch {
  /* use system ffmpeg */
}

export class ThumbnailService {
  async generate(videoFilePath: string): Promise<string> {
    const thumbnailFilename = `${uuidv4()}.jpg`
    const thumbnailPath = getUploadPath(thumbnailFilename)
    const uploadDir = path.dirname(thumbnailPath)

    return new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: thumbnailFilename,
          folder: uploadDir,
          size: '640x360',
        })
        .on('end', () => {
          logger.info(`Thumbnail generated: ${thumbnailFilename}`)
          resolve(thumbnailFilename)
        })
        .on('error', (err) => {
          logger.error('Thumbnail generation failed:', err)
          reject(err)
        })
    })
  }

  async getVideoMetadata(
    videoFilePath: string
  ): Promise<{ duration?: number; resolution?: string }> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
        if (err) {
          resolve({})
          return
        }
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
        resolve({
          duration: metadata.format.duration ? Math.round(metadata.format.duration) : undefined,
          resolution:
            videoStream?.width && videoStream?.height
              ? `${videoStream.width}x${videoStream.height}`
              : undefined,
        })
      })
    })
  }
}
