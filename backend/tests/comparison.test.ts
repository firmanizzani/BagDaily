import {describe,it,expect} from 'vitest';
import {comparisonRange,previousMonthRange} from '../src/modules/reports/comparison-rules.js';
describe('previous-month comparison boundaries',()=>{
 it('uses yesterday, equivalent last week, and preceding custom periods',()=>{
  const day=comparisonRange({from:new Date('2026-11-04T00:00:00+07:00'),to:new Date('2026-11-05T00:00:00+07:00'),compare:'day'});
  expect(day?.from).toEqual(new Date('2026-11-03T00:00:00+07:00'));expect(day?.to).toEqual(new Date('2026-11-04T00:00:00+07:00'));
  const week=comparisonRange({from:new Date('2026-11-02T00:00:00+07:00'),to:new Date('2026-11-05T00:00:00+07:00'),compare:'week'});
  expect(week?.from).toEqual(new Date('2026-10-26T00:00:00+07:00'));expect(week?.to).toEqual(new Date('2026-10-29T00:00:00+07:00'));
  const custom=comparisonRange({from:new Date('2026-11-02T00:00:00+07:00'),to:new Date('2026-11-05T00:00:00+07:00'),compare:'period'});
  expect(custom?.from).toEqual(new Date('2026-10-30T00:00:00+07:00'));expect(custom?.to).toEqual(new Date('2026-11-02T00:00:00+07:00'));
 });
 it('compares the same calendar-day window in Jakarta and preserves channel',()=>{
  const range=previousMonthRange({from:new Date('2026-11-01T00:00:00+07:00'),to:new Date('2026-11-05T00:00:00+07:00'),channel:'online'});
  expect(range).toEqual({from:new Date('2026-10-01T00:00:00+07:00'),to:new Date('2026-10-05T00:00:00+07:00'),channel:'online'});
 });
 it('preserves full calendar months including leap February and year boundaries',()=>{
  expect(previousMonthRange({from:new Date('2024-03-01T00:00:00+07:00'),to:new Date('2024-04-01T00:00:00+07:00')})?.to).toEqual(new Date('2024-03-01T00:00:00+07:00'));
  expect(previousMonthRange({from:new Date('2026-02-01T00:00:00+07:00'),to:new Date('2026-03-01T00:00:00+07:00')})?.to).toEqual(new Date('2026-02-01T00:00:00+07:00'));
  expect(previousMonthRange({from:new Date('2026-01-01T00:00:00+07:00'),to:new Date('2026-01-05T00:00:00+07:00')})?.from).toEqual(new Date('2025-12-01T00:00:00+07:00'));
 });
 it('clamps month-end days and does not invent an all-time comparison',()=>{
  const result=previousMonthRange({from:new Date('2026-03-31T00:00:00+07:00'),to:new Date('2026-04-01T00:00:00+07:00')});
  expect(result?.from).toEqual(new Date('2026-02-28T00:00:00+07:00'));expect(result?.to).toEqual(new Date('2026-03-01T00:00:00+07:00'));
  expect(previousMonthRange({})).toBeNull();
 });
});

it('compares rolling windows with the immediately preceding equal number of days',()=>{
 const seven=comparisonRange({from:new Date('2026-10-30T00:00:00+07:00'),to:new Date('2026-11-06T00:00:00+07:00'),compare:'7days'});
 expect(seven?.from).toEqual(new Date('2026-10-23T00:00:00+07:00'));expect(seven?.to).toEqual(new Date('2026-10-30T00:00:00+07:00'));
 const thirty=comparisonRange({from:new Date('2026-10-07T00:00:00+07:00'),to:new Date('2026-11-06T00:00:00+07:00'),compare:'30days'});
 expect(thirty?.from).toEqual(new Date('2026-09-07T00:00:00+07:00'));expect(thirty?.to).toEqual(new Date('2026-10-07T00:00:00+07:00'));
});
