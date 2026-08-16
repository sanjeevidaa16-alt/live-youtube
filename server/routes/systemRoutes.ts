import { Router, Response } from 'express';
import { SystemService } from '../services/systemService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/system/status - Full system metrics and diagnostic report
router.get('/status', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await SystemService.getSystemStatus();
    res.json({ status });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to retrieve system status: ${err.message}` });
  }
});

export default router;
