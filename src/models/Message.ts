import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  status: MessageStatus;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<IMessage>;

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    editedAt: { type: Date },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);
