import { z } from "zod";

export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  name: z.string().min(1),
  isGroup: z.boolean().default(false),
});