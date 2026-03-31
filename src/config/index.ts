import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: parseInt(process.env['PORT'] ?? '5000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  mongoUri: process.env['MONGO_URI'] ?? '',
  jwtSecret: process.env['JWT_SECRET'] ?? 'fallback_secret',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  clientUrl: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
  uploadDir: process.env['UPLOAD_DIR'] ?? 'uploads',
  maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] ?? '524288000', 10),
  isDev: process.env['NODE_ENV'] === 'development',
  isProd: process.env['NODE_ENV'] === 'production',
} as const

export default config
