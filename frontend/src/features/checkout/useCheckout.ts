import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';
import type { Order, ShippingRate } from '@/types/api';

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  deliveryMethod: 'shipping' | 'pickup';
  shippingRateId?: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
}

export function useShippingRates() {
  return useQuery({
    queryKey: ['shipping-rates'],
    queryFn: () => request<ShippingRate[]>('/shipping/rates'),
  });
}

export function useAdminShippingRates() {
  return useQuery({
    queryKey: ['admin-shipping-rates'],
    queryFn: () => request<ShippingRate[]>('/admin/shipping/rates'),
  });
}

export function useCreateShippingRate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ShippingRate>) =>
      request<ShippingRate>('/admin/shipping/rates', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Gagal menambahkan tarif pengiriman'),
    retry: false,
  });
}

export function useUpdateShippingRate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ShippingRate> }) =>
      request<ShippingRate>(`/admin/shipping/rates/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Gagal memperbarui tarif pengiriman'),
    retry: false,
  });
}

export function useCreateCheckoutOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderPayload) =>
      request<Order>('/orders', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Gagal membuat pesanan checkout'),
    retry: false,
  });
}
