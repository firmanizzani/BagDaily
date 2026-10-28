import { useQuery } from '@tanstack/react-query';
import { request } from '@/services/apiClient';
import type {
  CategorySalesItem,
  ChannelSalesItem,
  DashboardOverview,
  RestockRecommendation,
  Order,
  SalesTrendItem,
  TopProductItem,
} from '@/types/api';

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => request<DashboardOverview>('/admin/dashboard/overview'),
  });
}

export function useSalesTrend(interval: 'day' | 'week') {
  return useQuery({
    queryKey: ['dashboard-sales-trend', interval],
    queryFn: () =>
      request<SalesTrendItem[]>(`/admin/dashboard/sales-trend?interval=${interval}`),
  });
}

export function useCategorySales() {
  return useQuery({
    queryKey: ['dashboard-category-sales'],
    queryFn: () => request<CategorySalesItem[]>('/admin/dashboard/categories'),
  });
}

export function useTopProducts() {
  return useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: () => request<TopProductItem[]>('/admin/dashboard/top-products'),
  });
}

export function useSalesChannels() {
  return useQuery({
    queryKey: ['dashboard-sales-channels'],
    queryFn: () => request<ChannelSalesItem[]>('/admin/dashboard/channels'),
  });
}

export function useRestockRecommendations() {
  return useQuery({
    queryKey: ['dashboard-restock-recommendations'],
    queryFn: () =>
      request<RestockRecommendation[]>('/admin/dashboard/restock-recommendations'),
  });
}

export function useSalesReport(startDate: string, endDate: string) {
  const params = new URLSearchParams({ from: startDate, to: endDate });
  return useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () => request<Order[]>(`/admin/reports/sales?${params.toString()}`),
  });
}
