import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from '@/services/apiClient';

export function useApiQuery<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: [path],
    queryFn: ({ signal }) => request<T>(path, { signal }),
    placeholderData: [
      '/products',
      '/admin/products',
      '/admin/inventory',
      '/cashier/orders',
      '/cashier/transactions',
      '/orders/my',
    ].includes(path.split('?')[0] || '')
      ? keepPreviousData
      : undefined,
    enabled,
  });
}
