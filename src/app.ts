import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'path'
import config from './config/index'
import passport from './config/passport'
import authRoutes from './routes/auth.routes'

const app = express()

// Security
app.use(helmet())
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
)

// Cookie parser
app.use(cookieParser())

// Passport (no session — JWT only)
app.use(passport.initialize())

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static uploads
app.use('/uploads', express.static(path.join(process.cwd(), config.uploadDir)))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv })
})

// API routes
app.use('/api/auth', authRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

export default app
