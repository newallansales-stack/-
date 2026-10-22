import type {History, Interval, PricePoint, Product, Summary} from './types';
export type QuoteRow={date:string;price:number;source:string;url?:string;conditions?:string;count?:number};
export const chinaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function quoteHistory(rows:QuoteRow[],from:string,to:string,interval:Interval,releaseDate:string|null=null):History{
  if(!validDate(from)||!validDate(to)||from<'2020-01-01'||to>chinaToday()||from>to)throw new Error('请选择 2020-01-01 至今天之间的有效日期区间。');
  if(!['day','week','month'].includes(interval))throw new Error('图表周期必须为日、周或月。');
  const start=releaseDate&&releaseDate>from?releaseDate:from;
  const map=new Map<string,QuoteRow>();
  for(const row of rows.filter(r=>r.date>=start&&r.date<=to)){
    const p=map.get(row.date);const count=(p?.count||0)+(row.count||1);
    map.set(row.date,{...(p&&p.price<=row.price?p:row),count});
  }
  const daily=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const points:PricePoint[]=[];
  for(const row of daily){
    let date=row.date;
    if(interval==='month')date=date.slice(0,7)+'-01';
    if(interval==='week'){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);date=d.toISOString().slice(0,10);}
    const p=points.at(-1);
    if(p?.date===date){p.high=Math.max(p.high,row.price);p.low=Math.min(p.low,row.price);p.close=row.price;p.count+=row.count||1;}
    else points.push({date,open:row.price,high:row.price,low:row.price,close:row.price,count:row.count||1});
  }
  const expectedDays=start>to?0:Math.round((Date.parse(to)-Date.parse(start))/86400000)+1;
  const low=rows.reduce<QuoteRow|null>((a,b)=>!a||b.price<a.price?b:a,null);
  return{points,daily,coverage:{expectedDays,observedDays:daily.length,missingDays:expectedDays-daily.length,earliestDate:daily[0]?.date||null,latestDate:daily.at(-1)?.date||null},lowPrice:low?.price??null,lowDate:low?.date??null};
}
export function summaryFor(products:Product[],rows:QuoteRow[]):Summary{
  const days=[...new Set(rows.map(r=>r.date))].sort();
  return{productCount:products.length,observationCount:rows.length,recordedDays:days.length,earliestDate:days[0]||null,latestDate:days.at(-1)||null,sourceCount:new Set(rows.map(r=>r.source)).size};
}
export function csvText(columns:string[],rows:unknown[][]){
  const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
  return '\uFEFF'+columns.join(',')+'\r\n'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function downloadText(text:string,name:string,type='text/csv;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
