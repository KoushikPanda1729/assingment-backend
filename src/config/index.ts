import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: parseInt(process.env['PORT'] ?? '5000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  mongoUri: process.env['MONGO_URI'] ?? '',
  jwtSecret: process.env['JWT_SECRET'] ?? 'fallback_secret',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'fallback_refresh_secret',
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  clientUrl: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
  uploadDir: process.env['UPLOAD_DIR'] ?? 'uploads',
  maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] ?? '524288000', 10),
  googleClientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
  googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
  googleCallbackUrl:
    process.env['GOOGLE_CALLBACK_URL'] ?? 'http://localhost:5001/api/auth/google/callback',
  isDev: process.env['NODE_ENV'] === 'development',
  isProd: process.env['NODE_ENV'] === 'production',
} as const

export default config
