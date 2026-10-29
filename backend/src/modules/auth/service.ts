import jwt from 'jsonwebtoken';
import { users } from '../../db/schema/index.js';
import { env } from '../../config/env.js';

export const publicUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  phone: users.phone,
  address: users.address,
  avatarUrl: users.avatarUrl,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
  ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
};

export function createSession(user: typeof users.$inferSelect) {
  return jwt.sign({ version: user.sessionVersion }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '8h',
    algorithm: 'HS256',
    issuer: 'bagdaily',
    audience: 'bagdaily-web',
  });
}
