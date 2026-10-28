import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  role: 'pelanggan' | 'kasir' | 'admin';
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (!token) return unauthorized();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'bagdaily',
      audience: 'bagdaily-web',
      algorithms: ['HS256'],
    }) as { sub: string; version: number };

    const [row] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!row || !row.isActive || row.sessionVersion !== payload.version) {
      return unauthorized('Session invalid or revoked');
    }

    req.user = {
      id: row.id,
      role: row.role,
      email: row.email,
      name: row.name,
    };
    next();
  } catch {
    unauthorized('Session expired or invalid token');
  }
}

export function requireRole(...allowed: Array<'pelanggan' | 'kasir' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return unauthorized();
    if (!allowed.includes(req.user.role)) return forbidden();
    next();
  };
}
