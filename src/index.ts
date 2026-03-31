import { createServer } from 'http'
import app from './app'
import { connectDB } from './config/db'
import config from './config/index'
import { logger } from './utils/logger'

async function bootstrap() {
  await connectDB()

  const httpServer = createServer(app)

  httpServer.listen(config.port, () => {
    logger.info(`🚀 Server running on http://localhost:${config.port}`)
    logger.info(`📦 Environment: ${config.nodeEnv}`)
  })

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err)
    process.exit(1)
  })
}

bootstrap()
