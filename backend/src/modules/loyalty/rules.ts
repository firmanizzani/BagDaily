export function earnedPoints(totalPaid: number): number {
  if (!Number.isSafeInteger(totalPaid) || totalPaid < 0 || totalPaid > 2147483647) throw new RangeError('Invalid paid total');
  return Math.floor(totalPaid / 100);
}

export function pointQuote(total: number, requested: number) {
  if (!Number.isSafeInteger(total) || total < 0 || total > 2147483647 || !Number.isSafeInteger(requested) || requested < 0 || requested > total) throw new RangeError('Invalid points redemption');
  const totalPaid = total - requested;
  return { pointsRedeemed: requested, totalPaid, pointsExpected: earnedPoints(totalPaid) };
}
