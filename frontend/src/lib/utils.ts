import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const APP_TIME_ZONE = 'Asia/Jakarta';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      new Intl.DateTimeFormat('id-ID', {
        timeZone: APP_TIME_ZONE,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d) + ' WIB'
    );
  } catch {
    return iso;
  }
}

export function formatShortDate(iso: string, includeYear = true): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: APP_TIME_ZONE,
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' as const } : {}),
    }).format(d);
  } catch {
    return iso;
  }
}
