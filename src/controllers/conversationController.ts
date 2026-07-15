import type { Request, Response } from "express";
type AuthRequest = Request & { auth?: { sub: string } };
import * as conversationService from "../services/conversationService.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const getConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const data = await conversationService.getConversations(req.auth!.sub);

  res.status(200).json(
    new ApiResponse(true, "Conversations fetched successfully", data)
  );
};

export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const data = await conversationService.getMessages(
    req.params.conversationId,
    req.auth!.sub,
    typeof req.query.cursor === "string" ? req.query.cursor : undefined
  );

  res.status(200).json(
    new ApiResponse(true, "Messages fetched successfully", data)
  );
};

export const createConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const data = await conversationService.createConversation(
    req.body,
    req.auth!.sub
  );

  res.status(201).json(
    new ApiResponse(true, "Conversation created successfully", data)
  );
};