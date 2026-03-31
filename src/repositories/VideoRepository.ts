import { VideoModel, type IVideo, type VideoStatus } from '../models/Video'
import type { Types } from 'mongoose'

export interface VideoFilter {
  status?: VideoStatus | 'all'
  search?: string
  ownerId?: string
}

export class VideoRepository {
  async create(data: {
    title: string
    description?: string
    filename: string
    originalName: string
    mimetype: string
    size: number
    owner: Types.ObjectId
  }): Promise<IVideo> {
    const video = new VideoModel(data)
    return video.save()
  }

  async findById(id: string): Promise<IVideo | null> {
    return VideoModel.findById(id)
  }

  async findByIdAndOwner(id: string, ownerId: string): Promise<IVideo | null> {
    return VideoModel.findOne({ _id: id, owner: ownerId })
  }

  async findAll(filter: VideoFilter): Promise<IVideo[]> {
    const query: Record<string, unknown> = {}

    // Multi-tenant: if ownerId provided, restrict to that user
    if (filter.ownerId) query['owner'] = filter.ownerId

    if (filter.status && filter.status !== 'all') {
      query['status'] = filter.status
    }

    if (filter.search) {
      query['$or'] = [
        { title: { $regex: filter.search, $options: 'i' } },
        { originalName: { $regex: filter.search, $options: 'i' } },
      ]
    }

    return VideoModel.find(query).populate('owner', 'name email').sort({ createdAt: -1 })
  }

  async updateStatus(
    id: string,
    status: VideoStatus,
    extra?: {
      sensitivityScore?: number
      processingProgress?: number
      duration?: number
      resolution?: string
      thumbnail?: string
    }
  ): Promise<IVideo | null> {
    return VideoModel.findByIdAndUpdate(id, { status, ...extra }, { new: true })
  }

  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    await VideoModel.findByIdAndUpdate(id, { thumbnail })
  }

  async updateMetadata(
    id: string,
    data: { title: string; description?: string }
  ): Promise<IVideo | null> {
    return VideoModel.findByIdAndUpdate(
      id,
      { title: data.title, description: data.description ?? '' },
      { new: true }
    )
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await VideoModel.findByIdAndUpdate(id, { processingProgress: progress })
  }

  async delete(id: string): Promise<IVideo | null> {
    return VideoModel.findByIdAndDelete(id)
  }

  async countByOwner(
    ownerId: string
  ): Promise<{ total: number; safe: number; flagged: number; processing: number }> {
    const [total, safe, flagged, processing] = await Promise.all([
      VideoModel.countDocuments({ owner: ownerId }),
      VideoModel.countDocuments({ owner: ownerId, status: 'safe' }),
      VideoModel.countDocuments({ owner: ownerId, status: 'flagged' }),
      VideoModel.countDocuments({ owner: ownerId, status: 'processing' }),
    ])
    return { total, safe, flagged, processing }
  }

  async countAll(): Promise<{ total: number; safe: number; flagged: number; processing: number }> {
    const [total, safe, flagged, processing] = await Promise.all([
      VideoModel.countDocuments(),
      VideoModel.countDocuments({ status: 'safe' }),
      VideoModel.countDocuments({ status: 'flagged' }),
      VideoModel.countDocuments({ status: 'processing' }),
    ])
    return { total, safe, flagged, processing }
  }
}
