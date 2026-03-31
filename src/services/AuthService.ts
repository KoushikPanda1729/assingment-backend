import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRepository } from '../repositories/UserRepository'
import config from '../config/index'
import type { UserRole, JwtPayload } from '../types'
import type { IUser } from '../models/User'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(data: {
    name: string
    email: string
    password: string
    role: UserRole
  }): Promise<{ user: IUser; tokens: TokenPair }> {
    const exists = await this.userRepo.existsByEmail(data.email)
    if (exists) throw new Error('Email already registered')

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const user = await this.userRepo.create({ ...data, password: hashedPassword })

    const tokens = this.generateTokenPair({ id: String(user._id), role: user.role })
    await this.userRepo.saveRefreshToken(String(user._id), tokens.refreshToken)

    return { user, tokens }
  }

  async login(email: string, password: string): Promise<{ user: IUser; tokens: TokenPair }> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new Error('Invalid email or password')
    if (!user.password) throw new Error('Invalid email or password')

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new Error('Invalid email or password')

    const tokens = this.generateTokenPair({ id: String(user._id), role: user.role })
    await this.userRepo.saveRefreshToken(String(user._id), tokens.refreshToken)

    return { user, tokens }
  }

  async refresh(refreshToken: string): Promise<{ user: IUser; tokens: TokenPair }> {
    try {
      jwt.verify(refreshToken, config.jwtRefreshSecret)
    } catch {
      throw new Error('Invalid or expired refresh token')
    }

    const user = await this.userRepo.findByRefreshToken(refreshToken)
    if (!user) throw new Error('Refresh token not found')

    // Use role from DB (not JWT) so role changes take effect on next refresh
    const tokens = this.generateTokenPair({ id: String(user._id), role: user.role })
    await this.userRepo.saveRefreshToken(String(user._id), tokens.refreshToken)

    return { user, tokens }
  }

  async findById(id: string): Promise<IUser | null> {
    return this.userRepo.findById(id)
  }

  async updateProfile(id: string, data: { name?: string }): Promise<IUser | null> {
    return this.userRepo.updateProfile(id, data)
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findByIdWithPassword(id)
    if (!user) throw new Error('User not found')
    if (!user.password) throw new Error('Cannot change password for OAuth accounts')
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) throw new Error('Current password is incorrect')
    const hashed = await bcrypt.hash(newPassword, 12)
    await this.userRepo.updatePassword(id, hashed)
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.clearRefreshToken(userId)
  }

  async issueTokensForOAuthUser(user: IUser): Promise<TokenPair> {
    const tokens = this.generateTokenPair({ id: String(user._id), role: user.role })
    await this.userRepo.saveRefreshToken(String(user._id), tokens.refreshToken)
    return tokens
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  }

  private generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    })
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
    })
    return { accessToken, refreshToken }
  }
}
