import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRepository } from '../repositories/UserRepository'
import config from '../config/index'
import type { UserRole, JwtPayload } from '../types'
import type { IUser } from '../models/User'

export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(data: {
    name: string
    email: string
    password: string
    role: UserRole
  }): Promise<{ user: Omit<IUser, 'password'>; token: string }> {
    const exists = await this.userRepo.existsByEmail(data.email)
    if (exists) {
      throw new Error('Email already registered')
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const user = await this.userRepo.create({ ...data, password: hashedPassword })

    const token = this.generateToken({ id: String(user._id), role: user.role })
    return { user, token }
  }

  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.password) throw new Error('Invalid email or password')
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      throw new Error('Invalid email or password')
    }

    const token = this.generateToken({ id: String(user._id), role: user.role })
    return { user, token }
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    })
  }
}
