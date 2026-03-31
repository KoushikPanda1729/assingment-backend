import type { Request } from 'express'
import type { Types } from 'mongoose'

export type UserRole = 'viewer' | 'editor' | 'admin'

export type VideoStatus = 'pending' | 'processing' | 'safe' | 'flagged'

export interface JwtPayload {
  id: string
  role: UserRole
}

export interface AuthRequest extends Request {
  user?: {
    id: string
    role: UserRole
  }
}

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
}

export interface VideoMetadata {
  title: string
  description?: string
  ownerId: Types.ObjectId
  filename: string
  originalName: string
  mimetype: string
  size: number
  status: VideoStatus
  sensitivityScore?: number
  duration?: number
  url?: string
}
