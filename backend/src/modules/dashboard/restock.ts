/** Seven-day moving average, with a buffer above the low-stock threshold. */
export function restockAdvice(stock: number, minimumStock: number, soldLast7Days: number) {
  const average = soldLast7Days / 7;
  const next7DaysDemand = soldLast7Days;
  const targetStock = Math.min(2147483647, Math.max(next7DaysDemand, minimumStock + 1));
  return {
    soldLast7Days,
    averageDailySales: Math.round(average * 100) / 100,
    next7DaysDemand,
    targetStock,
    daysOfStock: average > 0 ? Math.round((stock / average) * 10) / 10 : null,
    recommendedQuantity: Math.max(0, targetStock - stock),
  };
}
