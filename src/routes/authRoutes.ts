import { Router } from 'express';
import { login, myProfile, register, getAllUsers } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(register));
authRoutes.post('/login', asyncHandler(login));
authRoutes.get('/myProfile', requireAuth, asyncHandler(myProfile));
authRoutes.get('/users', requireAuth, asyncHandler(getAllUsers));
