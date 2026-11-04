const jakartaOffset=7*60*60*1000;
function previousMonth(date:Date) {
 const local=new Date(date.getTime()+jakartaOffset);
 const day=local.getUTCDate();
 local.setUTCDate(1);local.setUTCMonth(local.getUTCMonth()-1);
 const lastDay=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,0)).getUTCDate();
 local.setUTCDate(Math.min(day,lastDay));
 return new Date(local.getTime()-jakartaOffset);
}
/** Preserve Jakarta calendar dates and the exclusive end, including full-month ranges. */
export function previousMonthRange(range:{from?:Date;to?:Date;channel?:string}) {
 if(!range.from||!range.to)return null;
 const localFrom=new Date(range.from.getTime()+jakartaOffset);
 const localTo=new Date(range.to.getTime()+jakartaOffset);
 const isMonthBoundary=(date:Date)=>date.getUTCDate()===1&&date.getUTCHours()===0&&date.getUTCMinutes()===0&&date.getUTCSeconds()===0&&date.getUTCMilliseconds()===0;
 if(isMonthBoundary(localFrom)&&isMonthBoundary(localTo))return {from:previousMonth(range.from),to:previousMonth(range.to),channel:range.channel};
 return {from:previousMonth(range.from),to:new Date(previousMonth(new Date(range.to.getTime()-1)).getTime()+1),channel:range.channel};
}

export function comparisonRange(range:{from?:Date;to?:Date;channel?:string;compare?:'day'|'week'|'month'|'period'}) {
 if(!range.from||!range.to)return null;
 if(!range.compare||range.compare==='month')return previousMonthRange(range);
 const offset=range.compare==='day'?86400000:range.compare==='week'?7*86400000:range.to.getTime()-range.from.getTime();
 return {from:new Date(range.from.getTime()-offset),to:new Date(range.to.getTime()-offset),channel:range.channel};
}
