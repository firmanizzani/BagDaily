export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: unknown) { super(message); this.name = 'AppError'; }
}
export function badRequest(code: string, message: string, details?: unknown): never { throw new AppError(400, code, message, details); }
export function unauthorized(message = 'Authentication required'): never { throw new AppError(401, 'UNAUTHORIZED', message); }
export function forbidden(message = 'Access denied'): never { throw new AppError(403, 'FORBIDDEN', message); }
export function notFound(message = 'Not found'): never { throw new AppError(404, 'NOT_FOUND', message); }
export function conflict(code: string, message: string): never { throw new AppError(409, code, message); }
