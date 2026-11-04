import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MetricChange} from './MetricChange';
const comparison={from:'2026-09-30T17:00:00Z',to:'2026-10-04T17:00:00Z',metrics:{netProductSales:100,totalTransactions:1,totalProductsSold:1,averagePayment:100,profit:20}};
describe('metric comparison presentation',()=>{
 it('matches labels to yesterday, last week and custom baselines',()=>{
  for(const [kind,label] of [['day','kemarin'],['week','minggu lalu'],['period','periode sebelumnya']] as const){
   const html=renderToStaticMarkup(<MetricChange current={120} comparison={{...comparison,kind}} metric="netProductSales" />);
   expect(html).toContain(`20% dari ${label}`);expect(html).not.toContain('bulan lalu');
  }
 });
 it('only uses red for a decrease, green for an increase and neutral for equal',()=>{
  const render=(current:number)=>renderToStaticMarkup(<MetricChange current={current} comparison={comparison} metric="netProductSales" />);
  expect(render(120)).toContain('metric-change-up');expect(render(120)).toContain('20% dari bulan lalu');
  expect(render(80)).toContain('metric-change-down');expect(render(100)).toContain('metric-change-flat');
  expect(render(100)).not.toContain('metric-change-down');
 });
 it('explains all time and unavailable profit without displaying a fake percentage',()=>{
  expect(renderToStaticMarkup(<MetricChange current={100} comparison={null} metric="netProductSales" />)).toContain('Pilih periode');
  expect(renderToStaticMarkup(<MetricChange current={null} comparison={comparison} metric="profit" />)).toContain('Data pembanding belum lengkap');
 });
});
