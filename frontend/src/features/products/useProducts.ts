import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/services/apiClient';
import type { Category, Product } from '@/types/api';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  availability?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  sku: string;
  categoryId: string;
  description?: string;
  material?: string;
  price: number;
  stock?: number;
  minimumStock?: number;
  isActive?: boolean;
}

export function useProducts(filters: ProductFilters = {}, enabled = true) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.availability) params.set('availability', filters.availability);
  if (filters.sort) params.set('sort', filters.sort);
  const limit = filters.limit ?? 12;
  if (filters.limit !== undefined) params.set('limit', String(limit));
  if (filters.offset !== undefined)
    params.set('page', String(Math.floor(filters.offset / limit) + 1));

  const query = params.toString();
  const path = query ? `/products?${query}` : '/products';

  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => request<Product[]>(path),
    enabled,
  });
}

export function useProduct(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => request<Product>(`/products/${id}`),
    enabled: Boolean(id) && enabled,
  });
}

export function useCategories(enabled = true) {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => request<Category[]>('/categories'),
    enabled,
  });
}

export function useAdminProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.availability) params.set('availability', filters.availability);
  if (filters.sort) params.set('sort', filters.sort);
  const limit = filters.limit ?? 12;
  if (filters.limit !== undefined) params.set('limit', String(limit));
  if (filters.offset !== undefined)
    params.set('page', String(Math.floor(filters.offset / limit) + 1));

  const query = params.toString();
  const path = query ? `/admin/products?${query}` : '/admin/products';

  return useQuery({
    queryKey: ['admin-products', filters],
    queryFn: () => request<Product[]>(path),
  });
}

export function useCreateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductPayload) =>
      request<Product>('/admin/products', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal membuat produk'),
    retry: false,
  });
}

export function useUpdateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProductPayload> }) =>
      request<Product>(`/admin/products/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui produk'),
    retry: false,
  });
}

export function useDeleteProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<Product>(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus produk'),
    retry: false,
  });
}

export function useUploadProductImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      return request<Product>(`/admin/products/${id}/image`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal mengunggah foto'),
    retry: false,
  });
}

export function useRemoveProductImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<Product>(`/admin/products/${id}/image`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus foto'),
    retry: false,
  });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; slug: string }) =>
      request<Category>('/admin/categories', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal membuat kategori'),
    retry: false,
  });
}

export function useUpdateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; slug: string } }) =>
      request<Category>(`/admin/categories/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui kategori'),
    retry: false,
  });
}

export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ success: boolean }>(`/admin/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus kategori'),
    retry: false,
  });
}
