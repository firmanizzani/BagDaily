import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';
import type { Order, User } from '@/types/api';

export function useOrders(path: string, enabled = true) {
  return useQuery({
    queryKey: ['orders', path],
    queryFn: () => request<Order[]>(path),
    enabled,
  });
}

export function useOrder(path: string, enabled = true) {
  return useQuery({
    queryKey: ['order', path],
    queryFn: () => request<Order>(path),
    enabled,
  });
}

export function useOrderAction<T = Order>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body,
      key,
    }: {
      path: string;
      method?: string;
      body?: unknown;
      key?: string;
    }) => request<T>(path, { method, body, idempotencyKey: key }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['order'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Permintaan gagal'),
    retry: false,
  });
}

export function useStaffUsers(path: string) {
  return useQuery({
    queryKey: ['admin-users', path],
    queryFn: () => request<User[]>(path),
  });
}

export function useStaffUserAction<T = User>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => request<T>(path, { method, body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Permintaan gagal'),
    retry: false,
  });
}
