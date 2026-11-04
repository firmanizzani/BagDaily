import { and, desc, eq, sql } from 'drizzle-orm';
import { db, type Tx } from '../../db/index.js';
import { loyaltyAccounts, loyaltyLedger, orders } from '../../db/schema/index.js';
import { conflict } from '../../utils/errors.js';
import { earnedPoints } from './rules.js';

type PointOrder = Pick<typeof orders.$inferSelect, 'id' | 'userId' | 'orderNumber' | 'total' | 'pointsRedeemed' | 'loyaltyProcessedAt'>;

async function lockWallet(tx: Tx, userId: string) {
  await tx.insert(loyaltyAccounts).values({ userId }).onConflictDoNothing();
  const [wallet] = await tx.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId)).for('update');
  return wallet!;
}

export async function reservePoints(tx: Tx, order: PointOrder) {
  if (!order.pointsRedeemed) return;
  if (!order.userId) conflict('MEMBER_REQUIRED', 'Pilih pelanggan terdaftar untuk memakai poin.');
  const wallet = await lockWallet(tx, order.userId!);
  if (wallet.balance - wallet.reserved < order.pointsRedeemed) conflict('INSUFFICIENT_POINTS', 'Saldo poin yang tersedia tidak mencukupi.');
  const reserved = wallet.reserved + order.pointsRedeemed;
  await tx.update(loyaltyAccounts).set({ reserved, updatedAt: new Date() }).where(eq(loyaltyAccounts.userId, order.userId!));
  await tx.insert(loyaltyLedger).values({ userId: order.userId!, orderId: order.id, orderNumber: order.orderNumber, kind: 'reserve', points: order.pointsRedeemed, balanceDelta: 0, reservedDelta: order.pointsRedeemed, balanceAfter: wallet.balance, reservedAfter: reserved });
}

export async function spendPoints(tx: Tx, order: PointOrder, useReservation: boolean) {
  if (!order.pointsRedeemed) return;
  if (!order.userId) conflict('MEMBER_REQUIRED', 'Pelanggan terdaftar diperlukan.');
  const [previous] = await tx.select().from(loyaltyLedger).where(and(eq(loyaltyLedger.orderId, order.id), eq(loyaltyLedger.kind, 'redeem')));
  if (previous) return;
  const wallet = await lockWallet(tx, order.userId!);
  if (useReservation) {
    const [hold] = await tx.select().from(loyaltyLedger).where(and(eq(loyaltyLedger.orderId, order.id), eq(loyaltyLedger.kind, 'reserve')));
    const [released] = await tx.select().from(loyaltyLedger).where(and(eq(loyaltyLedger.orderId, order.id), eq(loyaltyLedger.kind, 'release')));
    if (!hold || released || wallet.reserved < order.pointsRedeemed) conflict('POINTS_RESERVATION_INVALID', 'Reservasi poin tidak tersedia.');
  } else if (wallet.balance - wallet.reserved < order.pointsRedeemed) conflict('INSUFFICIENT_POINTS', 'Saldo poin yang tersedia tidak mencukupi.');
  const balance = wallet.balance - order.pointsRedeemed;
  const reserved = wallet.reserved - (useReservation ? order.pointsRedeemed : 0);
  if (balance < 0) conflict('INSUFFICIENT_POINTS', 'Saldo poin tidak mencukupi.');
  await tx.update(loyaltyAccounts).set({ balance, reserved, updatedAt: new Date() }).where(eq(loyaltyAccounts.userId, order.userId!));
  await tx.insert(loyaltyLedger).values({ userId: order.userId!, orderId: order.id, orderNumber: order.orderNumber, kind: 'redeem', points: order.pointsRedeemed, balanceDelta: -order.pointsRedeemed, reservedDelta: useReservation ? -order.pointsRedeemed : 0, balanceAfter: balance, reservedAfter: reserved });
}

/** Caller locks the order and invokes this only when the sale is complete. */
export async function awardPoints(tx: Tx, order: PointOrder) {
  if (order.loyaltyProcessedAt) return;
  const points = order.userId ? earnedPoints(order.total) : 0;
  if (order.userId) {
    const wallet = await lockWallet(tx, order.userId);
    const balance = wallet.balance + points;
    if (!Number.isSafeInteger(balance)) conflict('POINTS_BALANCE_LIMIT', 'Saldo poin melewati batas sistem.');
    await tx.update(loyaltyAccounts).set({ balance, updatedAt: new Date() }).where(eq(loyaltyAccounts.userId, order.userId));
    await tx.insert(loyaltyLedger).values({ userId: order.userId, orderId: order.id, orderNumber: order.orderNumber, kind: 'earn', points, balanceDelta: points, reservedDelta: 0, balanceAfter: balance, reservedAfter: wallet.reserved });
  }
  await tx.update(orders).set({ pointsEarned: points, loyaltyProcessedAt: new Date() }).where(eq(orders.id, order.id));
}

export async function releasePoints(tx: Tx, orderId: string) {
  await tx.execute(sql`select public.release_order_points(${orderId}::uuid)`);
}

export async function walletSummary(userId: string) {
  const [wallet] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId));
  const [pending] = await db.select({ points: sql<number>`coalesce(sum(floor(${orders.total}::numeric / 100)), 0)::bigint`.mapWith(Number) }).from(orders).where(and(eq(orders.userId, userId), eq(orders.channel, 'online'), eq(orders.paymentStatus, 'paid'), sql`${orders.status} not in ('completed','cancelled')`));
  const balance = wallet?.balance ?? 0;
  const reserved = wallet?.reserved ?? 0;
  return { balance, reserved, available: balance - reserved, pendingPoints: pending?.points ?? 0, earnRatePercent: 1, rupiahPerPoint: 1 };
}

export async function walletHistory(userId: string, page: number, limit: number) {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(loyaltyLedger).where(eq(loyaltyLedger.userId, userId));
  const rows = await db.select().from(loyaltyLedger).where(eq(loyaltyLedger.userId, userId)).orderBy(desc(loyaltyLedger.createdAt), desc(loyaltyLedger.id)).limit(limit).offset((page - 1) * limit);
  return { rows, count: count!.count };
}
