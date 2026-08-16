import { Router, Response } from 'express';
import { SupabaseStorageService } from '../services/supabaseStorageService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/storage/health - Storage health diagnostics
router.get('/health', async (_req, res: Response) => {
  try {
    const health = await SupabaseStorageService.getHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({
      supabaseConfigured: false,
      storageConfigured: false,
      bucketConfigured: false,
      bucket: 'videos',
      error: err.message,
    });
  }
});

// POST /api/storage/test - Real Supabase Storage test
router.post('/test', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await SupabaseStorageService.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      connected: false,
      bucketFound: false,
      writeTestPassed: false,
      readTestPassed: false,
      deleteTestPassed: false,
      message: `Test execution failed: ${err.message || 'Unknown error'}`,
      error: err.message,
      testedAt: new Date().toISOString(),
    });
  }
});

export default router;
