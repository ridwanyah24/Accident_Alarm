import { Router, Request, Response } from 'express';
import { getDbStore } from '../db';

const router = Router();

router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = getDbStore();
    const isDbHealthy = await store.checkHealth();
    if (isDbHealthy) {
      res.status(200).json({
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'DOWN',
        database: 'UNREACHABLE',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export const healthRouter = router;
