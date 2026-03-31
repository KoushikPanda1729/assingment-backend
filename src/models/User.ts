import mongoose, { Schema, Document } from 'mongoose'
import type { UserRole } from '../types'

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: UserRole
  googleId?: string
  avatar?: string
  refreshToken?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer',
    },
  },
  { timestamps: true }
)

export const UserModel = mongoose.model<IUser>('User', UserSchema)
