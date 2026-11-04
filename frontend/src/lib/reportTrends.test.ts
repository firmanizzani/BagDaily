import { describe, expect, it } from 'vitest';
import { categoryTimeline, completeTrend, reportDates } from './reportTrends';

describe('report timeline integrity', () => {
 it('fills quiet selling days with zero and preserves actual totals', () => {
  const points = completeTrend([{date:'2026-11-02',units:3,revenue:200000,transactions:1},{date:'2026-11-04',units:2,revenue:100000,transactions:1}], 'day', '2026-11-01','2026-11-05');
  expect(points).toHaveLength(5);
  expect(points[2]).toEqual({date:'2026-11-03',units:0,revenue:0,transactions:0});
  expect(points.reduce((sum,p)=>sum+p.units,0)).toBe(5);
  expect(points.reduce((sum,p)=>sum+p.revenue,0)).toBe(300000);
 });
 it('keeps empty reports empty and handles Monday weeks across years', () => {
  expect(completeTrend([], 'day', '2026-11-01','2026-11-05')).toEqual([]);
  expect(reportDates('2026-12-31','2027-01-05','week')).toEqual(['2026-12-28','2027-01-04']);
 });
 it('aligns categories by stable id, preserving zero months and equal display names', () => {
  const result=categoryTimeline([{month:'2026-09-01',categoryId:'one',name:'Tas',quantity:4},{month:'2026-11-01',categoryId:'two',name:'Tas',quantity:2}], '2026-09-01','2026-11-30');
  expect(result.categories).toHaveLength(2);
  expect(result.points).toEqual([{date:'2026-09-01',one:4,two:0},{date:'2026-10-01',one:0,two:0},{date:'2026-11-01',one:0,two:2}]);
 });
});
