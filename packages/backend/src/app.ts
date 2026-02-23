import express, { type Express } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use(routes);

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
