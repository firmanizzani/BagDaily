import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, request } from '@/services/apiClient';
import type { User } from '@/types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name: string;
  phone?: string;
  address?: string;
}

export function useUser() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return (await request<User>('/auth/me')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginPayload) =>
      request<User>('/auth/login', { method: 'POST', body }),
    onSuccess: async response => {
      await client.cancelQueries({ queryKey: ['session'] });
      client.setQueryData(['session'], response.data);
      void client.invalidateQueries({
        predicate: query => query.queryKey[0] !== 'session',
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Email atau password salah'),
    retry: false,
  });
}

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterPayload) =>
      request<User>('/auth/register', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Registrasi gagal. Coba lagi.'),
    retry: false,
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ['session'] });
      client.setQueryData(['session'], null);
      void client.invalidateQueries({
        predicate: query => query.queryKey[0] !== 'session',
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal keluar. Coba lagi.'),
    retry: false,
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfilePayload) =>
      request<User>('/auth/profile', { method: 'PATCH', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui profil'),
    retry: false,
  });
}
