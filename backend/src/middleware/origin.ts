import { Request, Response, NextFunction } from 'express';
import { allowedOrigins } from '../config/env.js';

export function validateOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers['origin'];
  if (!origin || !allowedOrigins.includes(origin)) { res.status(403).json({ data: null, error: { code: 'INVALID_ORIGIN', message: 'Forbidden origin' } }); return; }
  next();
}
