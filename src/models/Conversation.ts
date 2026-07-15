import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export interface IConversation {
  isGroup: boolean;
  name: string;
  participantIds: Types.ObjectId[];
  lastMessageId?: Types.ObjectId;
  unreadCounts: Map<string, number>;
}

export type ConversationDocument = HydratedDocument<IConversation>;

const conversationSchema = new Schema<IConversation>(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index({ participantIds: 1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
