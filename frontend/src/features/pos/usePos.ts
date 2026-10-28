import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';
import type { Order } from '@/types/api';

export interface PosCheckoutPayload {
  items: Array<{ productId: string; quantity: number }>;
  cashReceived: number;
}

export function useCreatePosTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: PosCheckoutPayload; key?: string }) =>
      request<Order>('/cashier/transactions', {
        method: 'POST',
        body,
        idempotencyKey: key,
      }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Transaksi kasir gagal diproses'),
    retry: false,
  });
}
