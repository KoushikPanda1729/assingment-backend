import { Server as HttpServer } from 'http'
import { Server as SocketServer, type Socket } from 'socket.io'
import config from '../config/index'
import { logger } from '../utils/logger'

export class SocketService {
  private io: SocketServer

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: config.clientUrl,
        credentials: true,
      },
    })

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`)

      socket.on('join:room', (userId: string) => {
        void socket.join(`user:${userId}`)
        logger.info(`Socket ${socket.id} joined room user:${userId}`)
      })

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`)
      })
    })
  }

  // Emit to a specific user's room
  emitToUser(userId: string, event: string, data: unknown): void {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  // Emit to all connected clients (admin broadcast)
  emitToAll(event: string, data: unknown): void {
    this.io.emit(event, data)
  }

  getIO(): SocketServer {
    return this.io
  }
}

// Singleton instance
let socketService: SocketService | null = null

export function initSocketService(httpServer: HttpServer): SocketService {
  socketService = new SocketService(httpServer)
  return socketService
}

export function getSocketService(): SocketService {
  if (!socketService) throw new Error('SocketService not initialized')
  return socketService
}
