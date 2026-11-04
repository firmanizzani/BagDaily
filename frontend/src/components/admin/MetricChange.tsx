import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { PeriodComparison } from '@/features/reports/types';
import { metricDelta } from '@/lib/metricDelta';
import { formatShortDate } from '@/lib/utils';
export function MetricChange({current,comparison,metric}:{current:number|null;comparison?:PeriodComparison|null;metric:keyof PeriodComparison['metrics']}) {
 if(comparison===undefined)return null;
 if(comparison===null)return <p className="metric-change metric-change-neutral">Pilih periode untuk membandingkan</p>;
 const result=metricDelta(current,comparison.metrics[metric]);
 const Icon=result.direction==='up'?ArrowUpRight:result.direction==='down'?ArrowDownRight:Minus;
 const baseline={day:'kemarin',week:'minggu lalu',month:'bulan lalu',period:'periode sebelumnya'}[comparison.kind??'month'];
 const text=result.direction==='unavailable'?'Data pembanding belum lengkap':result.percentage===null?`${result.direction==='up'?'Naik':'Turun'} dari 0 (${baseline})`:`${result.percentage>0&&result.percentage<0.01?'<0,01':result.percentage.toLocaleString('id-ID',{maximumFractionDigits:2})}% ${result.direction==='flat'?'sama dengan':'dari'} ${baseline}`;
 const description=`Periode pembanding: ${formatShortDate(comparison.from)} – ${formatShortDate(new Date(new Date(comparison.to).getTime()-1).toISOString())}.`;
 return <p className={`metric-change metric-change-${result.direction}`} title={description} aria-label={`${text}. ${description}`}><Icon size={13} aria-hidden="true" /><span>{text}</span></p>;
}
