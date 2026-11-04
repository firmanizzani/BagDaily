export interface PeriodComparison {
 kind?: 'day' | 'week' | 'month' | 'period';
 from: string;
 to: string;
 metrics: { netProductSales: number; totalTransactions: number; totalProductsSold: number; averagePayment: number; profit: number | null };
}
