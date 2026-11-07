import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '@/hooks/api';
import { completeTrend, categoryTimeline, type ReportInterval, type ReportTrends } from '@/lib/reportTrends';
import type { DateRange } from '@/lib/dateRange';
import { formatRupiah, formatShortDate } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

const categoryColors = ['#087362', '#b38b47', '#527f99', '#945f7a', '#6b7650', '#665d9c'];
const monthLabel = (date: string) => new Intl.DateTimeFormat('id-ID', {month:'short',year:'numeric', timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`));
export function ReportTrendCharts({ filters, range }: { filters: string; range: DateRange }) {
  const [metric, setMetric] = useState<'units' | 'netSales'>('netSales');
  const [interval, setInterval] = useState<ReportInterval>('day');
  const query = useApi<ReportTrends>(`/admin/reports/trends?${filters}&interval=${interval}`);
  const points = completeTrend(query.data?.data.sales ?? [], interval, range.from, range.to);
  const monthly = categoryTimeline(query.data?.data.monthly ?? [], range.from, range.to);
  const total = points.reduce((sum, point) => sum + point[metric], 0);
  const units = metric === 'units';
  const dateLabel = (date: string) => interval === 'month' ? monthLabel(date) : formatShortDate(date, false);
  const state = query.isLoading ? <LoadingState label="Menghitung tren penjualan…" /> : query.isError ? <ErrorState message="Tren belum dapat dimuat." onRetry={() => void query.refetch()} /> : null;
  return <div className="report-trend-grid">
    <section className="admin-panel report-main-trend">
      <header className="admin-panel-heading report-trend-heading"><div><h2>{units ? 'Tren Unit Terjual' : 'Tren Nilai Penjualan'}</h2><p>{units ? 'Jumlah barang dari transaksi berbayar.' : 'Nilai produk, tanpa ongkir dan setelah potongan poin.'}</p></div><select aria-label="Interval grafik laporan" value={interval} onChange={event => setInterval(event.target.value as ReportInterval)}><option value="day">Harian</option><option value="week">Mingguan</option><option value="month">Bulanan</option></select></header>
      <div className="report-trend-toolbar"><div className="report-metric-toggle" role="group" aria-label="Ukuran tren penjualan"><button type="button" aria-pressed={!units} onClick={() => setMetric('netSales')}>Nilai penjualan</button><button type="button" aria-pressed={units} onClick={() => setMetric('units')}>Unit terjual</button></div><p><strong>{units ? total.toLocaleString('id-ID') : formatRupiah(total)}</strong>{units && ' unit'} <span>dalam periode ini</span></p></div>
      {state || (!points.length ? <EmptyState title="Belum ada transaksi berbayar" description="Ubah periode atau kanal untuk melihat tren penjualan." /> : <div className="report-trend-canvas" role="img" aria-label={`${units ? 'Unit terjual' : 'Nilai penjualan'} per periode. Total ${units ? `${total} unit` : formatRupiah(total)}.`}><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{top:12,right:12,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="#e5e9e2" /><XAxis dataKey="date" tickFormatter={dateLabel} axisLine={false} tickLine={false} minTickGap={32} tick={{fontSize:11}} /><YAxis allowDecimals={!units} width={units ? 34 : 64} tickFormatter={value => units ? String(value) : new Intl.NumberFormat('id-ID',{notation:'compact', maximumFractionDigits:1}).format(Number(value))} axisLine={false} tickLine={false} tick={{fontSize:11}} /><Tooltip labelFormatter={value => interval === 'month' ? monthLabel(String(value)) : formatShortDate(String(value))} formatter={value => units ? [`${Number(value).toLocaleString('id-ID')} unit`, 'Terjual'] : [formatRupiah(Number(value)), 'Penjualan']} cursor={{fill:'#f0f4ed'}} /><Bar dataKey={metric} fill="#087362" maxBarSize={32} radius={[3,3,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>)}
      <p className="report-chart-footnote">Transaksi berbayar online dan POS, sesuai periode serta kanal yang dipilih.</p>
    </section>
    <section className="admin-panel report-category-trend"><header className="admin-panel-heading report-trend-heading"><div><h2>Tren Kategori per Bulan</h2><p>Bandingkan unit terjual untuk setiap kategori.</p></div></header>
      {state || (!monthly.points.length ? <EmptyState title="Belum ada tren kategori" description="Kategori akan tampil setelah ada transaksi berbayar." /> : <><div className="report-trend-toolbar report-category-legend">{monthly.categories.map((category,index) => <span key={category.id}><i style={{background:categoryColors[index % categoryColors.length]}} />{category.name}</span>)}</div><div className="report-trend-canvas" role="img" aria-label="Perbandingan unit terjual per kategori setiap bulan"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly.points} margin={{top:12,right:16,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="#e5e9e2" /><XAxis dataKey="date" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{fontSize:11}} minTickGap={25} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{fontSize:11}} /><Tooltip labelFormatter={value => monthLabel(String(value))} formatter={(value,name) => [`${Number(value).toLocaleString('id-ID')} unit`,name]} />{monthly.categories.map((category,index) => <Line key={category.id} dataKey={category.id} name={category.name} type="linear" stroke={categoryColors[index % categoryColors.length]} strokeWidth={2} dot={{r:3}} activeDot={{r:5}} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div><p className="report-chart-footnote">Bulan pertama dan terakhir dapat mencakup sebagian bulan, sesuai filter tanggal.</p></>)}
    </section>
  </div>;
}
