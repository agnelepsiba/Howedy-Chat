import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerTypingHandlers(_io: TypedServer, socket: TypedSocket): void {
  socket.on('typing:start', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      isTyping: false,
    });
  });
}
