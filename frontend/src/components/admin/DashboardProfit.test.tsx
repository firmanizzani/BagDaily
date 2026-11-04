import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DashboardProfitMetric } from './DashboardProfit';
const mock=vi.hoisted(()=>({useApi:vi.fn()}));
vi.mock('@/hooks/api',()=>({useApi:mock.useApi}));
const summary={totalPaid:245000,shipping:15000,netSales:230000,cost:175000,profit:55000,marginPercent:23.91,transactions:1,estimatedCostUnits:1,missingCostUnits:0,pendingTransactions:2,pointsDiscount:0};
describe('dashboard profit clarity',()=>{
 it('shows profit without removed margin or detail text',()=>{
  mock.useApi.mockReturnValue({data:{data:[],profitSummary:summary}});
  const html=renderToStaticMarkup(<MemoryRouter><DashboardProfitMetric range={{from:'2026-09-01',to:'2026-11-30'}} /></MemoryRouter>);
  expect(html).toContain('55.000');expect(html).not.toContain('Margin');expect(html).not.toContain('Rincian Keuntungan');
  expect(html).not.toContain('Setelah ongkir dan modal');
  expect(mock.useApi.mock.calls[0]?.[0]).toContain('/reports/profit?from=');
 });
 it('shows missing cost as incomplete, not a false zero or profit',()=>{
  mock.useApi.mockReturnValue({data:{data:[],profitSummary:{...summary,profit:null,marginPercent:null,missingCostUnits:1}}});
  const html=renderToStaticMarkup(<MemoryRouter><DashboardProfitMetric range={{from:'',to:''}} /></MemoryRouter>);
  expect(html).toContain('Belum lengkap');expect(html).not.toContain('55.000');
 });
});
