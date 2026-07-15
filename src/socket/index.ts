import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { registerMessageHandlers } from './handlers/messageHandlers.js';
import { registerTypingHandlers } from './handlers/typingHandlers.js';
import {
  handleConnect,
  handleDisconnect,
  registerPresenceHandlers,
} from './handlers/presenceHandlers.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types.js';
import { verifyToken } from '../services/jwtServices.js';

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: env.CLIENT_ORIGIN, credentials: true },
      pingInterval: 120000,     // Send ping every 2 minutes
      pingTimeout: 7200000,     // Wait 2 hours for pong response before disconnecting
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e6,   // 1MB buffer
    },
  );


  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication token required'));

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: user=${socket.data.userId} socket=${socket.id}`);

    // check if they're still connected elsewhere before marking offline).
    socket.join(`user:${socket.data.userId}`);

    void handleConnect(io, socket);

    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: user=${socket.data.userId} socket=${socket.id}`);
      void handleDisconnect(io, socket);
    });
  });

  return io;
}
