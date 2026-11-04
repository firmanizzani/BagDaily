export function profitFigures(netSales: number, knownCost: number, missingCostUnits: number) {
  const profit = missingCostUnits > 0 ? null : netSales - knownCost;
  return { profit, marginPercent: profit !== null && netSales > 0 ? Math.round(profit / netSales * 10000) / 100 : null };
}
