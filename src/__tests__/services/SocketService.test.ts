import { Server as HttpServer } from 'http'

const mockEmit = jest.fn()
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit })
const mockOn = jest.fn()
const MockSocketServer = jest.fn().mockImplementation(() => ({
  on: mockOn,
  to: mockTo,
  emit: mockEmit,
}))

jest.mock('socket.io', () => ({ Server: MockSocketServer }))

import { SocketService } from '../../services/SocketService'

describe('SocketService', () => {
  let service: SocketService
  const mockHttpServer = {} as HttpServer

  beforeEach(() => {
    jest.clearAllMocks()
    MockSocketServer.mockImplementation(() => ({ on: mockOn, to: mockTo, emit: mockEmit }))
    service = new SocketService(mockHttpServer)
  })

  it('should create SocketServer with cors config on construction', () => {
    expect(MockSocketServer).toHaveBeenCalledWith(
      mockHttpServer,
      expect.objectContaining({ cors: expect.any(Object) })
    )
  })

  it('emitToUser should emit to specific user room', () => {
    service.emitToUser('user123', 'test:event', { data: 1 })
    expect(mockTo).toHaveBeenCalledWith('user:user123')
    expect(mockEmit).toHaveBeenCalledWith('test:event', { data: 1 })
  })

  it('emitToAll should broadcast to all clients', () => {
    service.emitToAll('broadcast:event', { msg: 'hello' })
    expect(mockEmit).toHaveBeenCalledWith('broadcast:event', { msg: 'hello' })
  })

  it('getIO should return the socket server instance', () => {
    const mockIo = {
      on: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    }
    MockSocketServer.mockImplementation(() => mockIo)
    const svc = new SocketService(mockHttpServer)
    expect(svc.getIO()).toBe(mockIo)
  })
})

describe('getSocketService / initSocketService', () => {
  it('getSocketService should throw if not initialized', () => {
    jest.isolateModules(() => {
      const mod =
        require('../../services/SocketService') as typeof import('../../services/SocketService')
      expect(() => mod.getSocketService()).toThrow('SocketService not initialized')
    })
  })

  it('initSocketService should initialize and return service', () => {
    jest.isolateModules(() => {
      jest.mock('socket.io', () => ({
        Server: jest
          .fn()
          .mockImplementation(() => ({
            on: jest.fn(),
            to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            emit: jest.fn(),
          })),
      }))
      const mod =
        require('../../services/SocketService') as typeof import('../../services/SocketService')
      const svc = mod.initSocketService({} as HttpServer)
      expect(mod.getSocketService()).toBe(svc)
    })
  })
})
