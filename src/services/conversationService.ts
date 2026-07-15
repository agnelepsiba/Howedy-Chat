import { ApiError } from "../middleware/errorHandler.js";
import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";
import * as conversationRepository from "../repositories/conversationRepository.js";
import { createConversationSchema } from "../validators/conversationValidator.js";

const PAGE_SIZE = 30;

export const getConversations = async (userId: string) => {
  const conversations =
    await conversationRepository.findConversationsByUser(userId);

  const participantIds = conversations.flatMap((c) =>
    c.participantIds.map((id) => id.toString())
  );

  const userDocs = participantIds.length
    ? await User.find({ _id: { $in: participantIds } })
        .select("_id name")
        .lean()
    : [];

  const userNameMap = new Map(
    userDocs.map((user) => [user._id.toString(), user.name])
  );

  return conversations.map((c) => {
    const otherParticipantIds = c.participantIds
      .map((id) => id.toString())
      .filter((id) => id !== userId);

    const receiverName =
      otherParticipantIds.length === 1
        ? userNameMap.get(otherParticipantIds[0]) ?? "Unknown"
        : otherParticipantIds
            .map((id) => userNameMap.get(id) ?? "Unknown")
            .join(", ");

    return {
      id: c._id.toString(),
      isGroup: c.isGroup,
      name: c.name,
      participantIds: c.participantIds.map((id) => id.toString()),
      lastMessage: c.lastMessageId ?? undefined,
      unreadCount:
        (c.unreadCounts as Record<string, number> | undefined)?.[userId] ?? 0,
      yourName: userNameMap.get(userId) ?? "Unknown",
      participantName: receiverName,
    };
  });
};

export const getMessages = async (
  conversationId: string,
  userId: string,
  cursor?: string
) => {
  const docs = await conversationRepository.findMessages(
    conversationId,
    cursor
  );

  const conversation = await Conversation.findById(conversationId)
    .select("participantIds")
    .lean();

  const participantIds = conversation?.participantIds?.map((id) => id.toString()) ?? [];

  const userDocs = participantIds.length
    ? await User.find({ _id: { $in: participantIds } })
        .select("_id name")
        .lean()
    : [];

  const userNameMap = new Map(
    userDocs.map((user) => [user._id.toString(), user.name])
  );

  const messages = docs.reverse().map((message) => {
    const senderId = message.senderId?.toString();
    const senderName = userNameMap.get(senderId ?? "") ?? "Unknown";

    const otherParticipantIds = participantIds.filter((id) => id !== senderId);
    const receiverName =
      otherParticipantIds.length === 1
        ? userNameMap.get(otherParticipantIds[0]) ?? "Unknown"
        : otherParticipantIds
            .map((id) => userNameMap.get(id) ?? "Unknown")
            .join(", ");

    return {
      ...message,
      senderName,
      receiverName,
      isOwnMessage: senderId === userId,
      isRead: message.status === "read",
    };
  });

  const nextCursor =
    docs.length === PAGE_SIZE
      ? docs[docs.length - 1]._id.toString()
      : null;

  return {
    messages,
    nextCursor,
  };
};

export const createConversation = async (
  payload: unknown,
  currentUserId: string
) => {
  const parsed = createConversationSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.errors[0]?.message ?? "Invalid request payload"
    );
  }

  const { participantIds, name, isGroup } = parsed.data;

  const participants = [
    ...new Set([...participantIds, currentUserId]),
  ];

  return conversationRepository.createConversation({
    participantIds: participants,
    name,
    isGroup,
  });
};