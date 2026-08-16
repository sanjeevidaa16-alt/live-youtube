import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db.js';
import { User } from '../../src/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const DEFAULT_VPS_OPERATOR: User = {
  id: 'vps-operator',
  username: 'vps_operator',
  name: 'VPS Stream Operator',
  email: 'operator@castloop.local',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

export function generateToken(_user: any): string {
  return 'vps-direct-access-token';
}

// Authentication completely removed per system requirement. Pass-through middleware.
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  req.user = DEFAULT_VPS_OPERATOR;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  req.user = DEFAULT_VPS_OPERATOR;
  next();
}

// Simple in-memory rate limiter to protect endpoints against brute-force
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }

    record.count += 1;
    next();
  };
}
