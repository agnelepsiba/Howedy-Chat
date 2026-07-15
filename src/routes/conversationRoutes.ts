import { Router } from 'express';
import { getConversations, getMessages, createConversation as postConversation } from '../controllers/conversationController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const conversationRoutes = Router();

conversationRoutes.use(requireAuth);
conversationRoutes.get('/', asyncHandler(getConversations));
conversationRoutes.post('/', asyncHandler(postConversation));
conversationRoutes.get('/:conversationId/messages', asyncHandler(getMessages));
