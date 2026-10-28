import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';

export function useApiAction<T = unknown>() {
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
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Koneksi gagal. Coba lagi.'),
    retry: false,
  });
}
