import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import config from './config/index'

const app = express()

// Security
app.use(helmet())
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static uploads
app.use('/uploads', express.static(path.join(process.cwd(), config.uploadDir)))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv })
})

export default app
