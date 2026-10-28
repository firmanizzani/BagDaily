import crypto from 'crypto';

export function hashObject(obj: unknown): string { return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex'); }
export function sleepMs(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
export function delay(attempt: number): number { return Math.min(50 * 2 ** attempt + Math.random() * 30, 2000); }
