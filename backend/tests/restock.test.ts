import { describe, expect, it } from 'vitest';
import { restockAdvice } from '../src/modules/dashboard/restock.js';

describe('restock decisions', () => {
  it('covers seven days of demand and explains days remaining', () => {
    expect(restockAdvice(3, 2, 14)).toMatchObject({ targetStock: 14, recommendedQuantity: 11, averageDailySales: 2, daysOfStock: 1.5 });
  });
  it('uses a buffer above the warning threshold for slow sellers', () => {
    expect(restockAdvice(2, 5, 1)).toMatchObject({ targetStock: 6, recommendedQuantity: 4 });
  });
  it('does not pretend to predict coverage without sales', () => {
    expect(restockAdvice(0, 2, 0)).toMatchObject({ daysOfStock: null, recommendedQuantity: 3 });
  });
  it('does not recommend removing stock when supply exceeds demand', () => {
    expect(restockAdvice(30, 2, 14).recommendedQuantity).toBe(0);
  });
  it('calculates coverage from the unrounded daily rate', () => {
    expect(restockAdvice(1, 0, 1)).toMatchObject({ averageDailySales: 0.14, daysOfStock: 7 });
  });
});
