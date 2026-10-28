import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../utils/errors.js';

function pgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return;
  const e = err as { code?: string; cause?: unknown };
  return e.code ?? pgCode(e.cause);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ data: null, error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details: err.issues } });
    return;
  }
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ data: null, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 3MiB limit' } });
      return;
    }
    res.status(400).json({ data: null, error: { code: 'UPLOAD_ERROR', message: err.message } });
    return;
  }
  if (pgCode(err) === '23505') {
    res.status(409).json({ data: null, error: { code: 'RESOURCE_CONFLICT', message: 'Unique constraint conflict' } });
    return;
  }
  res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected internal error occurred' } });
}
