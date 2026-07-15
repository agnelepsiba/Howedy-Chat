import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { conversationRoutes } from './routes/conversationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';



export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', conversationRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler as unknown as ErrorRequestHandler);

  return app;
}
