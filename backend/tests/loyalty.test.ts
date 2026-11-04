import { describe, expect, it } from 'vitest';
import { earnedPoints, pointQuote } from '../src/modules/loyalty/rules.js';

describe('member points rules shared by online and POS', () => {
  it('earns exactly one percent when the paid amount is divisible by 100', () => {
    expect(earnedPoints(150000)).toBe(1500);
    expect(earnedPoints(245000)).toBe(2450);
  });
  it('rounds down only fractional points and never creates fractional currency', () => {
    expect(earnedPoints(123450)).toBe(1234);
    expect(earnedPoints(99)).toBe(0);
  });
  it('earns on the final payment after points discount', () => {
    expect(pointQuote(245000, 2500)).toEqual({ totalPaid: 242500, pointsRedeemed: 2500, pointsExpected: 2425 });
  });
  it('allows an entire bill to be paid by points without earning new points', () => {
    expect(pointQuote(10000, 10000)).toEqual({ totalPaid: 0, pointsRedeemed: 10000, pointsExpected: 0 });
  });
  it('rejects amounts beyond the bill, negative and fractional points', () => {
    for (const amount of [-1, 1.5, 101]) expect(() => pointQuote(100, amount)).toThrow();
    for (const total of [-1, 100.5, 2147483648]) expect(() => earnedPoints(total)).toThrow();
  });
});
