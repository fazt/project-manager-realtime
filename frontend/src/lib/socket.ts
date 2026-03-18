import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket
  }

  if (socket) {
    socket.disconnect()
  }

  socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:8000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
