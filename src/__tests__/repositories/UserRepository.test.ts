import { UserRepository } from '../../repositories/UserRepository'
import { UserModel } from '../../models/User'
import type { IUser } from '../../models/User'

jest.mock('../../models/User')

const mockUser = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'viewer',
  save: jest.fn(),
} as unknown as IUser

describe('UserRepository', () => {
  let repo: UserRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new UserRepository()
  })

  it('findByEmail should select password and return user', async () => {
    const selectMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findOne).mockReturnValue({ select: selectMock } as never)

    const result = await repo.findByEmail('test@example.com')

    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
    expect(selectMock).toHaveBeenCalledWith('+password')
    expect(result).toBe(mockUser)
  })

  it('findById should return user', async () => {
    jest.mocked(UserModel.findById).mockResolvedValue(mockUser as never)

    const result = await repo.findById('user123')

    expect(UserModel.findById).toHaveBeenCalledWith('user123')
    expect(result).toBe(mockUser)
  })

  it('findAll should return users sorted by createdAt', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockUser])
    const selectMock = jest.fn().mockReturnValue({ sort: sortMock })
    jest.mocked(UserModel.find).mockReturnValue({ select: selectMock } as never)

    const result = await repo.findAll()

    expect(result).toEqual([mockUser])
    expect(selectMock).toHaveBeenCalledWith('-password')
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
  })

  it('create should save and return new user', async () => {
    const saveMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel).mockImplementation(() => ({ save: saveMock }) as never)

    const result = await repo.create({
      name: 'Test',
      email: 'test@example.com',
      password: 'hashed',
      role: 'viewer',
    })

    expect(saveMock).toHaveBeenCalled()
    expect(result).toBe(mockUser)
  })

  it('existsByEmail should return true if user exists', async () => {
    jest.mocked(UserModel.countDocuments).mockResolvedValue(1 as never)

    const result = await repo.existsByEmail('test@example.com')

    expect(result).toBe(true)
  })

  it('existsByEmail should return false if user does not exist', async () => {
    jest.mocked(UserModel.countDocuments).mockResolvedValue(0 as never)

    const result = await repo.existsByEmail('none@example.com')

    expect(result).toBe(false)
  })

  it('updateRole should return updated user', async () => {
    const selectMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findByIdAndUpdate).mockReturnValue({ select: selectMock } as never)

    const result = await repo.updateRole('user123', 'editor')

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'user123',
      { role: 'editor' },
      { new: true }
    )
    expect(result).toBe(mockUser)
  })

  it('delete should call findByIdAndDelete', async () => {
    jest.mocked(UserModel.findByIdAndDelete).mockResolvedValue(mockUser as never)

    const result = await repo.delete('user123')

    expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith('user123')
    expect(result).toBe(mockUser)
  })

  it('saveRefreshToken should update user with token', async () => {
    jest.mocked(UserModel.findByIdAndUpdate).mockResolvedValue(null as never)

    await repo.saveRefreshToken('user123', 'refresh_token')

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
      refreshToken: 'refresh_token',
    })
  })

  it('clearRefreshToken should unset token', async () => {
    jest.mocked(UserModel.findByIdAndUpdate).mockResolvedValue(null as never)

    await repo.clearRefreshToken('user123')

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { refreshToken: undefined })
  })

  it('findByIdWithPassword should select password', async () => {
    const selectMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findById).mockReturnValue({ select: selectMock } as never)

    const result = await repo.findByIdWithPassword('user123')

    expect(selectMock).toHaveBeenCalledWith('+password')
    expect(result).toBe(mockUser)
  })

  it('updateProfile should return updated user', async () => {
    const selectMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findByIdAndUpdate).mockReturnValue({ select: selectMock } as never)

    const result = await repo.updateProfile('user123', { name: 'New Name' })

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'user123',
      { name: 'New Name' },
      { new: true }
    )
    expect(result).toBe(mockUser)
  })

  it('updatePassword should update hashed password', async () => {
    jest.mocked(UserModel.findByIdAndUpdate).mockResolvedValue(null as never)

    await repo.updatePassword('user123', 'new_hashed')

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { password: 'new_hashed' })
  })

  it('findByRefreshToken should return user with token', async () => {
    const selectMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findOne).mockReturnValue({ select: selectMock } as never)

    const result = await repo.findByRefreshToken('some_token')

    expect(UserModel.findOne).toHaveBeenCalledWith({ refreshToken: 'some_token' })
    expect(selectMock).toHaveBeenCalledWith('+refreshToken')
    expect(result).toBe(mockUser)
  })

  it('findByGoogleId should find user by googleId', async () => {
    jest.mocked(UserModel.findOne).mockResolvedValue(mockUser as never)

    const result = await repo.findByGoogleId('google123')

    expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: 'google123' })
    expect(result).toBe(mockUser)
  })

  it('findOrCreateGoogleUser should return existing user by googleId', async () => {
    jest.mocked(UserModel.findOne).mockResolvedValueOnce(mockUser as never)

    const result = await repo.findOrCreateGoogleUser({
      googleId: 'g123',
      name: 'T',
      email: 'e@e.com',
    })

    expect(result).toBe(mockUser)
  })

  it('findOrCreateGoogleUser should link googleId to existing email user', async () => {
    const saveMock = jest.fn().mockResolvedValue(mockUser)
    const existingUser = { ...mockUser, googleId: undefined, save: saveMock }
    jest
      .mocked(UserModel.findOne)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(existingUser as never)

    const result = await repo.findOrCreateGoogleUser({
      googleId: 'g123',
      name: 'T',
      email: 'test@example.com',
      avatar: 'pic.jpg',
    })

    expect(saveMock).toHaveBeenCalled()
    expect(result).toBe(mockUser)
  })

  it('findOrCreateGoogleUser should create new user if not found', async () => {
    const saveMock = jest.fn().mockResolvedValue(mockUser)
    jest.mocked(UserModel.findOne).mockResolvedValue(null as never)
    jest.mocked(UserModel).mockImplementation(() => ({ save: saveMock }) as never)

    const result = await repo.findOrCreateGoogleUser({
      googleId: 'new_g',
      name: 'New',
      email: 'new@example.com',
    })

    expect(saveMock).toHaveBeenCalled()
    expect(result).toBe(mockUser)
  })
})
