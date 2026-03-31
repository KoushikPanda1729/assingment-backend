import { VideoRepository } from '../../repositories/VideoRepository'
import { VideoModel } from '../../models/Video'
import type { IVideo } from '../../models/Video'
import { Types } from 'mongoose'

jest.mock('../../models/Video')

const mockVideo = {
  _id: new Types.ObjectId(),
  title: 'Test',
  filename: 'uuid.mp4',
  status: 'pending',
  owner: new Types.ObjectId(),
} as unknown as IVideo

describe('VideoRepository', () => {
  let repo: VideoRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new VideoRepository()
  })

  it('create should save and return video', async () => {
    const saveMock = jest.fn().mockResolvedValue(mockVideo)
    jest.mocked(VideoModel).mockImplementation(() => ({ save: saveMock }) as never)

    const result = await repo.create({
      title: 'Test',
      filename: 'uuid.mp4',
      originalName: 'test.mp4',
      mimetype: 'video/mp4',
      size: 1024,
      owner: new Types.ObjectId(),
    })

    expect(saveMock).toHaveBeenCalled()
    expect(result).toBe(mockVideo)
  })

  it('findById should return video', async () => {
    jest.mocked(VideoModel.findById).mockResolvedValue(mockVideo as never)

    const result = await repo.findById('vid123')

    expect(VideoModel.findById).toHaveBeenCalledWith('vid123')
    expect(result).toBe(mockVideo)
  })

  it('findByIdAndOwner should find by id and owner', async () => {
    jest.mocked(VideoModel.findOne).mockResolvedValue(mockVideo as never)

    const result = await repo.findByIdAndOwner('vid123', 'owner123')

    expect(VideoModel.findOne).toHaveBeenCalledWith({ _id: 'vid123', owner: 'owner123' })
    expect(result).toBe(mockVideo)
  })

  it('findAll should apply status filter', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockVideo])
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock })
    jest.mocked(VideoModel.find).mockReturnValue({ populate: populateMock } as never)

    await repo.findAll({ status: 'safe' })

    expect(VideoModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'safe' }))
  })

  it('findAll should apply ownerId filter', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockVideo])
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock })
    jest.mocked(VideoModel.find).mockReturnValue({ populate: populateMock } as never)

    await repo.findAll({ ownerId: 'owner123' })

    expect(VideoModel.find).toHaveBeenCalledWith(expect.objectContaining({ owner: 'owner123' }))
  })

  it('findAll should apply search filter', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockVideo])
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock })
    jest.mocked(VideoModel.find).mockReturnValue({ populate: populateMock } as never)

    await repo.findAll({ search: 'keyword' })

    expect(VideoModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) })
    )
  })

  it('findAll should not filter by status when "all"', async () => {
    const sortMock = jest.fn().mockResolvedValue([])
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock })
    jest.mocked(VideoModel.find).mockReturnValue({ populate: populateMock } as never)

    await repo.findAll({ status: 'all' })

    const query = jest.mocked(VideoModel.find).mock.calls[0]?.[0] as unknown as Record<
      string,
      unknown
    >
    expect(query['status']).toBeUndefined()
  })

  it('updateStatus should update with extra fields', async () => {
    jest.mocked(VideoModel.findByIdAndUpdate).mockResolvedValue(mockVideo as never)

    await repo.updateStatus('vid123', 'safe', { sensitivityScore: 85, processingProgress: 100 })

    expect(VideoModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'vid123',
      { status: 'safe', sensitivityScore: 85, processingProgress: 100 },
      { new: true }
    )
  })

  it('delete should call findByIdAndDelete', async () => {
    jest.mocked(VideoModel.findByIdAndDelete).mockResolvedValue(mockVideo as never)

    const result = await repo.delete('vid123')

    expect(VideoModel.findByIdAndDelete).toHaveBeenCalledWith('vid123')
    expect(result).toBe(mockVideo)
  })

  it('countByOwner should return counts by status', async () => {
    jest.mocked(VideoModel.countDocuments).mockResolvedValue(5 as never)

    const result = await repo.countByOwner('owner123')

    expect(result).toEqual({ total: 5, safe: 5, flagged: 5, processing: 5 })
    expect(VideoModel.countDocuments).toHaveBeenCalledTimes(4)
  })

  it('countAll should return global counts', async () => {
    jest.mocked(VideoModel.countDocuments).mockResolvedValue(10 as never)

    const result = await repo.countAll()

    expect(result).toEqual({ total: 10, safe: 10, flagged: 10, processing: 10 })
  })

  it('updateThumbnail should update thumbnail field', async () => {
    jest.mocked(VideoModel.findByIdAndUpdate).mockResolvedValue(null as never)

    await repo.updateThumbnail('vid123', 'thumb.jpg')

    expect(VideoModel.findByIdAndUpdate).toHaveBeenCalledWith('vid123', { thumbnail: 'thumb.jpg' })
  })

  it('updateMetadata should update title and description', async () => {
    jest.mocked(VideoModel.findByIdAndUpdate).mockResolvedValue(mockVideo as never)

    const result = await repo.updateMetadata('vid123', {
      title: 'New Title',
      description: 'New Desc',
    })

    expect(VideoModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'vid123',
      { title: 'New Title', description: 'New Desc' },
      { new: true }
    )
    expect(result).toBe(mockVideo)
  })

  it('updateProgress should update processingProgress', async () => {
    jest.mocked(VideoModel.findByIdAndUpdate).mockResolvedValue(null as never)

    await repo.updateProgress('vid123', 60)

    expect(VideoModel.findByIdAndUpdate).toHaveBeenCalledWith('vid123', { processingProgress: 60 })
  })
})
