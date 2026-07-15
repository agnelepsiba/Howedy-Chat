import type { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { Message } from '../../models/Message.js';
import { Conversation } from '../../models/Conversation.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerMessageHandlers(io: TypedServer, socket: TypedSocket): void {
  socket.on('message:send', async ({ clientId, conversationId, body }) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participantIds.some((id) => id.equals(socket.data.userId))) {
        socket.emit('message:error', { clientId, reason: 'Not a participant of this conversation' });
        return;
      }

      const doc = await Message.create({
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(socket.data.userId),
        body: trimmed,
        status: 'sent',
      });

      // Bump conversation's lastMessage + unread counts for everyone but the sender.
      const unreadUpdates: Record<string, number> = {};
      for (const participantId of conversation.participantIds) {
        const idStr = participantId.toString();
        if (idStr !== socket.data.userId) {
          const current = conversation.unreadCounts.get(idStr) ?? 0;
          unreadUpdates[`unreadCounts.${idStr}`] = current + 1;
        }
      }
      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { lastMessageId: doc._id, ...unreadUpdates } },
      );

      const payload = {
        id: doc._id.toString(),
        clientId,
        conversationId,
        senderId: socket.data.userId,
        body: doc.body,
        createdAt: doc.createdAt.toISOString(),
        status: 'sent' as const,
      };

      // Confirm to the sender (swaps their optimistic message for the real one)...
      socket.emit('message:ack', { clientId, message: payload });

      // Push to the conversation room for users who joined it, and also to each participant's
      // personal room so connected recipients still receive the event without needing an
      // explicit join step.
      socket.to(conversationId).emit('message:new', payload);
      for (const participantId of conversation.participantIds) {
        const participantIdStr = participantId.toString();
        if (participantIdStr === socket.data.userId) continue;

        io.to(`user:${participantIdStr}`).emit('message:new', payload);
        io.to(`user:${participantIdStr}`).emit('conversation:update', {
          conversationId,
          message: payload,
          userId: participantIdStr,
        });
      }
    } catch (err) {
      console.error('[socket] message:send failed', err);
      socket.emit('message:error', { clientId, reason: 'Failed to send message' });
    }
  });

  socket.on('conversation:markRead', async ({ conversationId }) => {
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`unreadCounts.${socket.data.userId}`]: 0 } },
    );

    const unreadMessages = await Message.find({
      conversationId,
      senderId: { $ne: socket.data.userId },
      status: { $ne: 'read' },
    }).select('_id senderId').lean();

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((m) => m._id.toString());

      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: 'read' } },
      );

      // Tell the room (and each sender's personal room) exactly which
      // messages were marked read, so clients can update their local state.
      io.to(conversationId).emit('message:bulkStatusUpdate', {
        messageIds,
        status: 'read',
        conversationId,
      });

      const senderIds = new Set(unreadMessages.map((m) => m.senderId.toString()));
      for (const senderId of senderIds) {
        io.to(`user:${senderId}`).emit('message:bulkStatusUpdate', {
          messageIds,
          status: 'read',
          conversationId,
        });
      }
    }

    io.to(conversationId).emit('conversation:read', {
      conversationId,
      userId: socket.data.userId,
    });
  });

  socket.on('message:updateStatus', async ({ messageId, status }) => {
  if (!['delivered', 'read'].includes(status)) return; // clients should never set 'sent' — only server does

  try {
    const message = await Message.findById(messageId).lean();
    if (!message) {
      socket.emit('message:error', { clientId: messageId, reason: 'Message not found' });
      return;
    }

    if (message.senderId.toString() === socket.data.userId) return;

    const updated = await Message.findByIdAndUpdate(messageId, { status }, { new: true }).lean();
    if (!updated) return;

    const payload = {
      messageId: updated._id.toString(),
      status,
      updatedAt: updated.updatedAt?.toISOString(),
    };

    io.to(updated.conversationId.toString()).emit('message:statusUpdate', payload);
    io.to(`user:${updated.senderId.toString()}`).emit('message:statusUpdate', payload);
  } catch (err) {
    console.error('[socket] message:updateStatus failed', err);
    socket.emit('message:error', { clientId: messageId, reason: 'Failed to update message status' });
  }
});
}
