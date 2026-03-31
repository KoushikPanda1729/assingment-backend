import mongoose from 'mongoose'
import config from './index'

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(config.mongoUri)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}
