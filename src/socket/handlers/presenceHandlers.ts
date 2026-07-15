import type { Server, Socket } from 'socket.io';
import { User } from '../../models/User.js';
import { Conversation } from '../../models/Conversation.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerPresenceHandlers(_io: TypedServer, socket: TypedSocket): void {
  socket.on('conversation:join', async ({ conversationId }) => {
    const conversation = await Conversation.findById(conversationId).lean();
    const isParticipant = conversation?.participantIds.some((id) => id.toString() === socket.data.userId);
    if (!isParticipant) return;
    socket.join(conversationId);
  });

  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(conversationId);
  });
}

export async function handleConnect(io: TypedServer, socket: TypedSocket): Promise<void> {
  const user = await User.findByIdAndUpdate(
    socket.data.userId,
    { isOnline: true, lastSeenAt: new Date() },
    { new: true },
  ).lean();

  if (user) {
    io.emit('presence:update', {
      id: user._id.toString(),
      name: user.name,
      avatarUrl: user.avatarUrl,
      isOnline: true,
      lastSeenAt: user.lastSeenAt.toISOString(),
    });
  }
}

export async function handleDisconnect(io: TypedServer, socket: TypedSocket): Promise<void> {
  const sockets = await io.in(`user:${socket.data.userId}`).fetchSockets();
  if (sockets.length > 0) return;

  const user = await User.findByIdAndUpdate(
    socket.data.userId,
    { isOnline: false, lastSeenAt: new Date() },
    { new: true },
  ).lean();

  if (user) {
    io.emit('presence:update', {
      id: user._id.toString(),
      name: user.name,
      avatarUrl: user.avatarUrl,
      isOnline: false,
      lastSeenAt: user.lastSeenAt.toISOString(),
    });
  }
}
