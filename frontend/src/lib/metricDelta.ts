export function metricDelta(current:number|null,previous:number|null) {
 if(current===null||previous===null)return {direction:'unavailable' as const,percentage:null};
 const difference=current-previous;
 const direction=difference>0?'up':difference<0?'down':'flat';
 return {direction,percentage:previous===0?(difference===0?0:null):Math.abs(difference/Math.abs(previous))*100};
}
