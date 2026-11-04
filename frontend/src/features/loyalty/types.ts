export interface LoyaltySummary {
  balance: number;
  reserved: number;
  available: number;
  pendingPoints: number;
  earnRatePercent: number;
  rupiahPerPoint: number;
}
export interface LoyaltyEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: 'earn' | 'reserve' | 'redeem' | 'release';
  points: number;
  balanceDelta: number;
  reservedDelta: number;
  balanceAfter: number;
  reservedAfter: number;
  createdAt: string;
}
