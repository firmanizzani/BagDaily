import type { Role } from '@/types/api';

export function loginDestination(role: Role, returnUrl?: unknown) {
  if (role === 'admin') return '/admin';
  if (role === 'kasir') return '/pos';
  if (
    typeof returnUrl !== 'string' ||
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//')
  ) {
    return '/';
  }
  const pathname = new URL(returnUrl, 'https://bagdaily.local').pathname;
  if (pathname === '/login' || pathname === '/register') return '/';
  return returnUrl;
}
