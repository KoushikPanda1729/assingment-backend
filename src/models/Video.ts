import mongoose, { Schema, Document, Types } from 'mongoose'

export type VideoStatus = 'pending' | 'processing' | 'safe' | 'flagged'

export interface IVideo extends Document {
  title: string
  description?: string
  filename: string // stored filename (uuid-based, never exposed)
  originalName: string // original upload filename
  mimetype: string
  size: number // bytes
  duration?: number // seconds
  resolution?: string // e.g. "1920x1080"
  thumbnail?: string // thumbnail filename (uuid-based)
  status: VideoStatus
  sensitivityScore?: number // 0-100
  processingProgress: number // 0-100
  owner: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const VideoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: Number,
    resolution: String,
    thumbnail: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'safe', 'flagged'],
      default: 'pending',
    },
    sensitivityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

// Compound index for efficient filtering per user
VideoSchema.index({ owner: 1, status: 1, createdAt: -1 })

export const VideoModel = mongoose.model<IVideo>('Video', VideoSchema)
