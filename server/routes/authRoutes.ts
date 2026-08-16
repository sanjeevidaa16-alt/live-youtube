import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const DEFAULT_OPERATOR = {
  id: 'vps-operator',
  username: 'vps_operator',
  name: 'VPS Stream Operator',
  email: 'operator@castloop.local',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
};

// GET /api/auth/me - Direct operator status
router.get('/me', (_req, res) => {
  res.json({ user: DEFAULT_OPERATOR, token: 'vps-direct-token' });
});

// POST /api/auth/login - Always return operator session
router.post('/login', (_req, res) => {
  res.json({ token: 'vps-direct-token', user: DEFAULT_OPERATOR });
});

// POST /api/auth/admin-login
router.post('/admin-login', (_req, res) => {
  res.json({ token: 'vps-direct-token', user: DEFAULT_OPERATOR });
});

// GET /api/auth/users
router.get('/users', (_req, res) => {
  res.json({ users: [DEFAULT_OPERATOR] });
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', (_req, res) => {
  res.json({ success: true });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
