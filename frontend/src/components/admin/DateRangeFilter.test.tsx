import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {DateRangeFilter} from './DateRangeFilter';
import {recentDateRange} from '@/lib/dateRange';
describe('rolling date dropdown',()=>{
 afterEach(()=>vi.useRealTimers());
 it('shows four dropdown choices, defaults to thirty days, and has no reset button',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-05T04:00:00Z'));
  const html=renderToStaticMarkup(<DateRangeFilter value={recentDateRange()} onChange={()=>{}} />);
  expect(html).toContain('aria-label="Pilih periode laporan"');
  expect(html).toContain('value="last30" selected=""');
  expect(html.match(/<option /g)).toHaveLength(4);
  expect(html).toContain('7 hari terakhir');expect(html).toContain('30 hari terakhir');
  expect(html).not.toContain('Minggu ini');expect(html).not.toContain('Bulan ini');expect(html).not.toContain('Reset');
 });
 it('labels a custom date range without selecting all time',()=>{
  const html=renderToStaticMarkup(<DateRangeFilter value={{from:'2020-01-01',to:'2020-01-10'}} onChange={()=>{}} />);
  expect(html).toContain('Rentang tanggal khusus');expect(html).not.toContain('value="all" selected');
 });
});
