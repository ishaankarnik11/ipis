import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

// Health check endpoint
router.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
