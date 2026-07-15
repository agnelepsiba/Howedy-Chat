export interface ChatMessagePayload {
  id: string;
  clientId: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  editedAt?: string;
}

export interface ChatUserPayload {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface TypingStatePayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ServerToClientEvents {
  'message:new': (message: ChatMessagePayload) => void;
  'message:updated': (message: ChatMessagePayload) => void;
  'message:ack': (payload: { clientId: string; message: ChatMessagePayload }) => void;
  'message:error': (payload: { clientId: string; reason: string }) => void;
  'message:statusUpdate': (payload: { messageId: string; status: string; updatedAt: string }) => void;
  'presence:update': (user: ChatUserPayload) => void;
  'typing:update': (state: TypingStatePayload) => void;
  'conversation:read': (payload: { conversationId: string; userId: string }) => void;
  'conversation:update': (payload: { conversationId: string; message: ChatMessagePayload; userId: string }) => void;
  'message:bulkStatusUpdate': (payload: {
    messageIds: string[];
    status: 'delivered' | 'read';
    conversationId: string;
  }) => void; 
}

export interface ClientToServerEvents {
  'message:send': (payload: { clientId: string; conversationId: string; body: string }) => void;
  'message:updateStatus': (payload: { messageId: string; status: string }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
  'conversation:join': (payload: { conversationId: string }) => void;
  'conversation:leave': (payload: { conversationId: string }) => void;
  'conversation:markRead': (payload: { conversationId: string }) => void;
}

export interface InterServerEvents {
  // reserved for multi-node pub/sub events if you add Redis adapter scaling
}

export interface SocketData {
  userId: string;
  email: string;
}
