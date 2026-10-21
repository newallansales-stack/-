import archiveJson from '../datasets/public-prices.json';
import type { Category, Interval, PricePoint } from './types';

export type QuoteKind = 'reference' | 'retailer_relay';
export type ArchiveProduct = {
  id:string; name:string; category:Exclude<Category,'all'>; professional:boolean;gpuClass?:'consumer'|'professional'|'unknown'|null;
  url:string; fields:{label:string;value:string}[];
};
export type PublicQuote = {
  id:string;productId:string;date:string;observedAt:string;currency:'CNY';kind:QuoteKind;
  price:number;merchant:string|null;merchantUrl:string|null;source:string;sourceUrl:string;
  effectiveDate:null;availability:'unknown';verification:'source_page_only';conditions:string;
};
export type PublicArchive = {
  version:number;updatedAt:string;requestedHistoryStart:string;description:string;
  products:ArchiveProduct[];observations:PublicQuote[];
  lastCollection:{observedAt:string;productsRead:number;successfulPages:number;attempts:{url:string;status:string;error?:string}[]};
};
export const publicArchive = archiveJson as unknown as PublicArchive;
export const quoteKindLabel = (kind:QuoteKind) => kind==='retailer_relay'?'转引电商报价':'网站参考价';
export function archiveSeries(quotes:PublicQuote[],interval:Interval):PricePoint[] {
  const daily=new Map<string,{price:number;count:number}>();
  for(const q of quotes) {
    const previous=daily.get(q.date);
    daily.set(q.date,{price:Math.min(previous?.price??Infinity,q.price),count:(previous?.count??0)+1});
  }
  const points:PricePoint[]=[];
  for(const [day,record] of [...daily.entries()].sort(([a],[b])=>a.localeCompare(b))) {
    let date=day;
    if(interval==='month') date=`${day.slice(0,7)}-01`;
    if(interval==='week') {
      const d=new Date(`${day}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);date=d.toISOString().slice(0,10);
    }
    const last=points.at(-1);
    if(last?.date===date) {last.high=Math.max(last.high,record.price);last.low=Math.min(last.low,record.price);last.close=record.price;last.count+=record.count;}
    else points.push({date,open:record.price,high:record.price,low:record.price,close:record.price,count:record.count});
  }
  return points;
}

function cell(value:unknown) {
  let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;
  return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}
export function archiveCsv(archive:PublicArchive=publicArchive) {
  const products=new Map(archive.products.map(p=>[p.id,p]));
  const columns=['product_id','category','name','specifications','observation_date','observed_at','price','currency','quote_kind','source','evidence_url','merchant_url','effective_date','availability','verification','conditions','data_mode'];
  const lines=archive.observations.map(q=>{
    const p=products.get(q.productId)!;
    return [p.id,p.category,p.name,p.fields.map(f=>`${f.label}：${f.value}`).join('；'),q.date,q.observedAt,q.price,q.currency,q.kind,q.source,q.sourceUrl,q.merchantUrl,'',q.availability,q.verification,q.conditions,'public_quote_archive'].map(cell).join(',');
  });
  return '\uFEFF'+columns.join(',')+'\r\n'+lines.join('\r\n')+'\r\n';
}
