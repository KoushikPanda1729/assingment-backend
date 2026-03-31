import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import config from './index'

const ALLOWED_MIMETYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/webm',
  'video/x-matroska', // .mkv
]

// Ensure upload dir exists
const uploadDir = path.join(process.cwd(), config.uploadDir)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    // uuid-based filename — original name never used for storage
    const ext = path.extname(file.originalname).toLowerCase()
    const safeFilename = `${uuidv4()}${ext}`
    cb(null, safeFilename)
  },
})

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed: mp4, mov, avi, webm, mkv`))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize, // 500MB default
  },
})

export function getUploadPath(filename: string): string {
  return path.join(uploadDir, filename)
}
