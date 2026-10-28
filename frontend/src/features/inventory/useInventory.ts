import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';
import type { Product, StockMovement } from '@/types/api';

export interface StockAdjustmentPayload {
  productId: string;
  type: 'restock' | 'correction';
  quantity: number;
  notes?: string;
}

export function useInventory(page = 1, limit = 12, enabled = true) {
  return useQuery({
    queryKey: ['admin-inventory', page, limit],
    queryFn: () => request<Product[]>(`/admin/inventory?page=${page}&limit=${limit}`),
    enabled,
  });
}

export function useLowStock(page = 1, limit = 12, enabled = true) {
  return useQuery({
    queryKey: ['admin-inventory-low-stock', page, limit],
    queryFn: () =>
      request<Product[]>(`/admin/inventory/low-stock?page=${page}&limit=${limit}`),
    enabled,
  });
}

export function useStockMovements(page = 1, limit = 15, enabled = true) {
  return useQuery({
    queryKey: ['admin-inventory-movements', page, limit],
    queryFn: () =>
      request<StockMovement[]>(`/admin/inventory/movements?page=${page}&limit=${limit}`),
    enabled,
  });
}

export function useAdjustStock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: StockAdjustmentPayload; key?: string }) =>
      request<StockMovement>('/admin/inventory/adjustments', {
        method: 'POST',
        body,
        idempotencyKey: key,
      }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menyesuaikan stok'),
    retry: false,
  });
}
