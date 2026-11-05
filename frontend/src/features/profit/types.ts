import type { PeriodComparison } from '@/features/reports/types';
export interface ProfitSummary {
 comparison?: PeriodComparison | null;
 totalPaid: number; shipping: number; merchandise: number; pointsDiscount: number;
 netSales: number; cost: number; profit: number | null; marginPercent: number | null;
 transactions: number; units: number; pendingTransactions: number; estimatedCostUnits: number; missingCostUnits: number;
}
export interface ProfitRow {
 id: string; orderNumber: string; channel: 'online' | 'pos'; paidAt: string;
 totalPaid: number; shipping: number; merchandise: number; pointsDiscount: number; netSales: number;
 cost: number; profit: number | null; marginPercent: number | null; estimated: number; missing: number;
}
