import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { PeriodComparison } from '@/features/reports/types';
import { metricDelta } from '@/lib/metricDelta';
import { formatShortDate } from '@/lib/utils';
export function MetricChange({current,comparison,metric,mode='percent'}:{current:number|null;comparison?:PeriodComparison|null;metric:keyof PeriodComparison['metrics'];mode?:'percent'|'points'}) {
 if(comparison===undefined)return null;
 if(comparison===null)return <p className="metric-change metric-change-neutral">Pilih periode untuk membandingkan</p>;
 const previous=comparison.metrics[metric]??null;
 const result=metricDelta(current,previous);
 const Icon=result.direction==='up'?ArrowUpRight:result.direction==='down'?ArrowDownRight:Minus;
 const baseline={day:'kemarin',week:'minggu lalu',month:'bulan lalu',period:'periode sebelumnya','7days':'7 hari lalu','30days':'30 hari lalu'}[comparison.kind??'30days'];
 const amount=mode==='points'&&current!==null&&previous!==null?Math.abs(current-previous):result.percentage;
 const rounded=amount===null?null:Math.round(amount*100)/100;
 const text=result.direction==='unavailable'?'Data pembanding belum lengkap':rounded===null?`${result.direction==='up'?'Naik':'Turun'} dari 0 (${baseline})`:`${amount!>0&&rounded===0?'<0,01':rounded.toLocaleString('id-ID',{maximumFractionDigits:2})}${mode==='points'?' pp':'%'} ${result.direction==='flat'?'sama dengan':'dari'} ${baseline}`;
 const description=`${mode==='points'?'pp berarti poin persentase. ':''}Periode pembanding: ${formatShortDate(comparison.from)} – ${formatShortDate(new Date(new Date(comparison.to).getTime()-1).toISOString())}.`;
 return <p className={`metric-change metric-change-${result.direction}`} title={description} aria-label={`${text}. ${description}`}><Icon size={13} aria-hidden="true" /><span>{text}</span></p>;
}
