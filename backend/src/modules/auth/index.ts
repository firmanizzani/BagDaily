import { Router } from 'express';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { env } from '../../config/env.js';
import { asyncRoute as a } from '../../utils/async.js';
import { credentialsSchema, registerSchema } from '../../utils/validation.js';
import { AppError, badRequest, unauthorized } from '../../utils/errors.js';
import { authenticate } from '../../middleware/auth.js';
import { cookieOptions, createSession, publicUser } from './service.js';
import { saveProductImage, removeProductImage } from '../products/media.js';

export { publicUser } from './service.js';

const router = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' },
    });
  },
});

router.post('/register', limiter, a(async (req, res) => {
  const input = registerSchema.parse(req.body);
  if (Buffer.byteLength(input.password) > 72) {
    throw new AppError(400, 'PASSWORD_TOO_LONG', 'Password must be at most 72 UTF-8 bytes');
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [user] = await db.insert(users).values({
    name: input.name,
    email: input.email,
    passwordHash,
  }).returning();

  res.cookie(
    env.SESSION_COOKIE_NAME,
    createSession(user),
    { ...cookieOptions, maxAge: 8 * 3600 * 1000 },
  );

  const { passwordHash: _hash, sessionVersion: _version, ...safe } = user;
  res.status(201).json({ data: safe });
}));

router.post('/login', limiter, a(async (req, res) => {
  const input = credentialsSchema.strict().parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? '$2b$12$KIXxJx9pXXg6aPN6OW5t3OMmNbl2F4aM60DAv9xFsaJ5gdDkM2SuK',
  );
  if (!user || !valid || !user.isActive) {
    unauthorized('Invalid email or password');
  }

  res.cookie(
    env.SESSION_COOKIE_NAME,
    createSession(user),
    { ...cookieOptions, maxAge: 8 * 3600 * 1000 },
  );

  const { passwordHash: _hash, sessionVersion: _version, ...safe } = user;
  res.json({ data: safe });
}));

router.use(a(authenticate));

router.post('/profile/avatar', avatarUpload.single('image'), a(async (req, res) => {
  if (!req.file) badRequest('NO_FILE', 'Pilih foto profil terlebih dahulu.');
  const type = await fileTypeFromBuffer(req.file.buffer);
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
    badRequest('INVALID_FILE', 'Foto profil harus berupa JPEG, PNG, atau WebP.');
  }
  const image = await saveProductImage(`avatars/${req.user!.id}`, req.file.buffer, type.ext, type.mime);
  let result;
  try {
    result = await db.transaction(async tx => {
      const [current] = await tx.select().from(users).where(eq(users.id, req.user!.id)).for('update');
      const [updated] = await tx.update(users).set({
        avatarPath: image.imagePath,
        avatarUrl: image.imageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, req.user!.id)).returning(publicUser);
      return { current, updated };
    });
  } catch (error) {
    await removeProductImage(image.imagePath).catch(() => {});
    throw error;
  }
  if (result.current.avatarPath) {
    await removeProductImage(result.current.avatarPath).catch(() => {});
  }
  res.json({ data: result.updated });
}));

router.delete('/profile/avatar', a(async (req, res) => {
  const { current, updated } = await db.transaction(async tx => {
    const [current] = await tx.select().from(users).where(eq(users.id, req.user!.id)).for('update');
    const [updated] = await tx.update(users).set({
      avatarPath: null,
      avatarUrl: null,
      updatedAt: new Date(),
    }).where(eq(users.id, req.user!.id)).returning(publicUser);
    return { current, updated };
  });
  if (current.avatarPath) await removeProductImage(current.avatarPath).catch(() => {});
  res.json({ data: updated });
}));

router.get('/me', a(async (req, res) => {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, req.user!.id));
  res.json({ data: user });
}));

router.post('/logout', a(async (req, res) => {
  await db.update(users).set({
    sessionVersion: sql`${users.sessionVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(users.id, req.user!.id));

  res.clearCookie(env.SESSION_COOKIE_NAME, cookieOptions);
  res.json({ data: { success: true } });
}));

router.patch('/profile', a(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().max(30).nullable().optional(),
    address: z.string().max(1000).nullable().optional(),
    currentPassword: z.string().optional(),
    password: z.string().min(8).max(72).optional(),
  }).strict().parse(req.body);

  const { password, currentPassword, ...fields } = input;
  const changes: Partial<typeof users.$inferInsert> = { ...fields, updatedAt: new Date() };

  if (password) {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      unauthorized('Current password incorrect');
    }
    if (Buffer.byteLength(password) > 72) {
      throw new AppError(400, 'PASSWORD_TOO_LONG', 'Password must be at most 72 UTF-8 bytes');
    }
    changes.passwordHash = await bcrypt.hash(password, 12);
    changes.sessionVersion = user.sessionVersion + 1;
  }

  const [user] = await db.update(users).set(changes).where(eq(users.id, req.user!.id)).returning(publicUser);
  if (password) {
    res.clearCookie(env.SESSION_COOKIE_NAME, cookieOptions);
  }
  res.json({ data: user });
}));

export default router;
