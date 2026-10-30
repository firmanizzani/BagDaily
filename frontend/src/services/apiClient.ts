import type {
  ApiResponse,
  CustomerSummary,
  CustomerSalesItem,
  OrderStatus,
  SalesReportSummary,
  TopProductItem,
} from '@/types/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'HTTP_ERROR',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
}

export interface Result<T> extends ApiResponse<T> {
  summary?: SalesReportSummary;
  products?: TopProductItem[];
  customer?: CustomerSummary;
  customers?: CustomerSalesItem[];
  statusCounts?: Partial<Record<OrderStatus, number>>;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<Result<T>> {
  const {
    params,
    body,
    headers: customHeaders,
    idempotencyKey,
    ...fetchOptions
  } = options;
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (search.size) url += `${url.includes('?') ? '&' : '?'}${search}`;
  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
  let finalBody: BodyInit | undefined;
  if (body instanceof FormData) finalBody = body;
  else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? AbortSignal.timeout(15000),
      credentials: 'include',
      headers,
      body: finalBody,
    });
  } catch {
    throw new ApiError(
      0,
      'API tidak dapat dihubungi. Periksa koneksi lalu coba lagi.',
      'NETWORK_ERROR',
    );
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload: Result<T> | null = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message || 'Permintaan gagal. Silakan coba lagi.',
      payload?.error?.code,
      payload?.error?.details,
    );
  }
  if (!payload || !('data' in payload) || payload.error) {
    throw new ApiError(502, 'Respons API tidak sesuai format.', 'INVALID_RESPONSE');
  }
  return payload;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export async function downloadReport(params: URLSearchParams): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/reports/sales/export?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiResponse<null> | null;
    throw new ApiError(response.status, payload?.error?.message || 'Unduhan CSV gagal.');
  }
  if (!response.headers.get('content-type')?.includes('text/csv')) {
    throw new ApiError(502, 'Respons unduhan bukan CSV.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bagdaily-sales.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
