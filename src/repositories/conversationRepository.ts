
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { Types } from "mongoose";

const PAGE_SIZE = 30;

export const findConversationsByUser = async (userId: string) => {
  return Conversation.find({ participantIds: userId })
    .populate("lastMessageId")
    .sort({ updatedAt: -1 })
    .lean();
};

export const findMessages = async (
  conversationId: string,
  cursor?: string
) => {
  const query: Record<string, unknown> = {
    conversationId: new Types.ObjectId(conversationId),
  };

  if (cursor) {
    query._id = {
      $lt: new Types.ObjectId(cursor),
    };
  }

  return Message.find(query)
    .sort({ _id: -1 })
    .limit(PAGE_SIZE)
    .lean();
};

export const createConversation = async (payload: {
  participantIds: string[];
  name: string;
  isGroup: boolean;
}) => {
  return Conversation.create(payload);
};