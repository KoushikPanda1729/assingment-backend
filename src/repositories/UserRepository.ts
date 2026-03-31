import { UserModel, type IUser } from '../models/User'
import type { UserRole } from '../types'

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email }).select('+password')
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id)
  }

  async findAll(): Promise<IUser[]> {
    return UserModel.find().select('-password').sort({ createdAt: -1 })
  }

  async create(data: {
    name: string
    email: string
    password: string
    role: UserRole
  }): Promise<IUser> {
    const user = new UserModel(data)
    return user.save()
  }

  async updateRole(id: string, role: UserRole): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, { role }, { new: true }).select('-password')
  }

  async delete(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(id)
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await UserModel.countDocuments({ email })
    return count > 0
  }

  async saveRefreshToken(id: string, token: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { refreshToken: token })
  }

  async findByRefreshToken(token: string): Promise<IUser | null> {
    return UserModel.findOne({ refreshToken: token }).select('+refreshToken')
  }

  async clearRefreshToken(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { refreshToken: undefined })
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return UserModel.findOne({ googleId })
  }

  async findOrCreateGoogleUser(data: {
    googleId: string
    name: string
    email: string
    avatar?: string
  }): Promise<IUser> {
    let user = await UserModel.findOne({ googleId: data.googleId })
    if (user) return user

    user = await UserModel.findOne({ email: data.email })
    if (user) {
      user.googleId = data.googleId
      if (data.avatar) user.avatar = data.avatar
      return user.save()
    }

    const newUser = new UserModel({
      ...data,
      role: 'viewer',
    })
    return newUser.save()
  }
}
