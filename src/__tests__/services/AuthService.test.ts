import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthService } from '../../services/AuthService'
import { UserRepository } from '../../repositories/UserRepository'
import type { IUser } from '../../models/User'

jest.mock('../../repositories/UserRepository')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const mockUserRepo = jest.mocked(new UserRepository())

const mockUser = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  role: 'viewer' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as IUser

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AuthService(mockUserRepo)
    jest.mocked(jwt.sign).mockReturnValue('mock_token' as never)
  })

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      jest.mocked(mockUserRepo.existsByEmail).mockResolvedValue(false)
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never)
      jest.mocked(mockUserRepo.create).mockResolvedValue(mockUser)
      jest.mocked(mockUserRepo.saveRefreshToken).mockResolvedValue()

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer',
      })

      expect(result.user).toBe(mockUser)
      expect(result.tokens.accessToken).toBe('mock_token')
      expect(result.tokens.refreshToken).toBe('mock_token')
      expect(mockUserRepo.existsByEmail).toHaveBeenCalledWith('test@example.com')
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
    })

    it('should throw if email already registered', async () => {
      jest.mocked(mockUserRepo.existsByEmail).mockResolvedValue(true)

      await expect(
        service.register({ name: 'A', email: 'test@example.com', password: 'pass', role: 'viewer' })
      ).rejects.toThrow('Email already registered')
    })
  })

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)
      jest.mocked(mockUserRepo.saveRefreshToken).mockResolvedValue()

      const result = await service.login('test@example.com', 'password123')

      expect(result.user).toBe(mockUser)
      expect(result.tokens.accessToken).toBe('mock_token')
    })

    it('should throw if user not found', async () => {
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
      await expect(service.login('no@user.com', 'pass')).rejects.toThrow(
        'Invalid email or password'
      )
    })

    it('should throw if password does not match', async () => {
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never)
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid email or password'
      )
    })

    it('should throw if user has no password (OAuth account)', async () => {
      const oauthUser = { ...mockUser, password: undefined } as unknown as IUser
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(oauthUser)
      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(
        'Invalid email or password'
      )
    })
  })

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      jest.mocked(jwt.verify).mockReturnValue({ id: 'user123', role: 'viewer' } as never)
      jest.mocked(mockUserRepo.findByRefreshToken).mockResolvedValue(mockUser)
      jest.mocked(mockUserRepo.saveRefreshToken).mockResolvedValue()

      const result = await service.refresh('valid_refresh_token')

      expect(result.user).toBe(mockUser)
      expect(result.tokens.accessToken).toBe('mock_token')
    })

    it('should throw if refresh token is invalid', async () => {
      jest.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid')
      })
      await expect(service.refresh('bad_token')).rejects.toThrow('Invalid or expired refresh token')
    })

    it('should throw if refresh token not found in DB', async () => {
      jest.mocked(jwt.verify).mockReturnValue({} as never)
      jest.mocked(mockUserRepo.findByRefreshToken).mockResolvedValue(null)
      await expect(service.refresh('token')).rejects.toThrow('Refresh token not found')
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      jest.mocked(mockUserRepo.findByIdWithPassword).mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)
      jest.mocked(bcrypt.hash).mockResolvedValue('new_hashed' as never)
      jest.mocked(mockUserRepo.updatePassword).mockResolvedValue()

      await expect(service.changePassword('user123', 'oldpass', 'newpass')).resolves.not.toThrow()
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user123', 'new_hashed')
    })

    it('should throw if user not found', async () => {
      jest.mocked(mockUserRepo.findByIdWithPassword).mockResolvedValue(null)
      await expect(service.changePassword('id', 'old', 'new')).rejects.toThrow('User not found')
    })

    it('should throw for OAuth accounts without password', async () => {
      const oauthUser = { ...mockUser, password: undefined } as unknown as IUser
      jest.mocked(mockUserRepo.findByIdWithPassword).mockResolvedValue(oauthUser)
      await expect(service.changePassword('id', 'old', 'new')).rejects.toThrow(
        'Cannot change password for OAuth accounts'
      )
    })

    it('should throw if current password is incorrect', async () => {
      jest.mocked(mockUserRepo.findByIdWithPassword).mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never)
      await expect(service.changePassword('id', 'wrong', 'new')).rejects.toThrow(
        'Current password is incorrect'
      )
    })
  })

  describe('logout', () => {
    it('should clear refresh token', async () => {
      jest.mocked(mockUserRepo.clearRefreshToken).mockResolvedValue()
      await service.logout('user123')
      expect(mockUserRepo.clearRefreshToken).toHaveBeenCalledWith('user123')
    })
  })

  describe('verifyAccessToken', () => {
    it('should return payload for valid token', () => {
      const payload = { id: 'user123', role: 'viewer' as const }
      jest.mocked(jwt.verify).mockReturnValue(payload as never)
      expect(service.verifyAccessToken('token')).toEqual(payload)
    })

    it('should throw for invalid token', () => {
      jest.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid')
      })
      expect(() => service.verifyAccessToken('bad')).toThrow()
    })
  })

  describe('issueTokensForOAuthUser', () => {
    it('should generate and save tokens for OAuth user', async () => {
      jest.mocked(mockUserRepo.saveRefreshToken).mockResolvedValue()
      const tokens = await service.issueTokensForOAuthUser(mockUser)
      expect(tokens.accessToken).toBe('mock_token')
      expect(tokens.refreshToken).toBe('mock_token')
      expect(mockUserRepo.saveRefreshToken).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return user by id', async () => {
      jest.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
      const result = await service.findById('user123')
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user123')
      expect(result).toBe(mockUser)
    })

    it('should return null if user not found', async () => {
      jest.mocked(mockUserRepo.findById).mockResolvedValue(null)
      const result = await service.findById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('should update and return user', async () => {
      jest.mocked(mockUserRepo.updateProfile).mockResolvedValue(mockUser)
      const result = await service.updateProfile('user123', { name: 'New Name' })
      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith('user123', { name: 'New Name' })
      expect(result).toBe(mockUser)
    })
  })
})
