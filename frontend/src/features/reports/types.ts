export interface PeriodComparison {
 kind?: 'day' | 'week' | 'month' | 'period' | '7days' | '30days';
 from: string;
 to: string;
 metrics: { netProductSales: number; totalTransactions: number; totalProductsSold: number; averagePayment: number; profit: number | null; completedSales?: number; completedUnits?: number; costOfGoods?: number | null; profitMargin?: number | null };
}
