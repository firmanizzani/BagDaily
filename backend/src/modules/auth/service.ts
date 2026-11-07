import jwt from 'jsonwebtoken';
import { users } from '../../db/schema/index.js';
import { allowedOrigins, env } from '../../config/env.js';

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

const sessionCookie = {
  httpOnly: true,
  secure: true,
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
  ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
};

export function cookieOptions(origin: string | undefined) {
  if (env.NODE_ENV !== 'development' || !origin || !allowedOrigins.includes(origin)) {
    return sessionCookie;
  }

  const { protocol, hostname } = new URL(origin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (env.DEV_EMBEDDED_SESSION === 'true' && (loopback || protocol === 'https:')) {
    return { ...sessionCookie, sameSite: 'none' as const, partitioned: true };
  }
  // Phones use the laptop's Wi-Fi address, which has no localhost cookie exception.
  if (protocol === 'http:' && !loopback) return { ...sessionCookie, secure: false };
  return sessionCookie;
}

export function createSession(user: typeof users.$inferSelect) {
  return jwt.sign({ version: user.sessionVersion }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '8h',
    algorithm: 'HS256',
    issuer: 'bagdaily',
    audience: 'bagdaily-web',
  });
}
