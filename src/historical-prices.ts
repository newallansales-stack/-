import json from '../datasets/historical-prices.json';
import type {Category,Interval,PricePoint} from './types';
export type HistoricalQuote={
  id:string;productKey:string;name:string;reportedSpecification:string|null;category:Exclude<Category,'all'>;
  platform:string;sku:string|null;merchantUrl:string|null;publicationDate:string;publishedAt:string;observedAt:string;
  price:number;currency:'CNY';source:string;sourceUrl:string;sourceTitle:string;quoteType:'promotion'|'reported_listing';
  priceEvidence:string;rawPrice:string;conditions:string;articleContext:string|null;effectiveDate:null;
  dateBasis:'article_publication';verification:'published_article_only';availability:'historical_unknown';note:string;
};
export type HistoricalArchive={version:number;updatedAt:string;description?:string;records:HistoricalQuote[];
  discovery:{scannedDays:number;candidates:number;checkedArticles:number;firstScannedDate?:string|null;lastScannedDate?:string|null}};
export const historicalArchive=json as unknown as HistoricalArchive;
export function historicalSeries(records:HistoricalQuote[],interval:Interval):PricePoint[]{
  const daily=new Map<string,{price:number;count:number}>();
  for(const r of records){const p=daily.get(r.publicationDate);daily.set(r.publicationDate,{price:Math.min(p?.price??Infinity,r.price),count:(p?.count??0)+1});}
  const points:PricePoint[]=[];
  for(const [day,r]of[...daily.entries()].sort(([a],[b])=>a.localeCompare(b))){
    let date=day;
    if(interval==='month')date=day.slice(0,7)+'-01';
    if(interval==='week'){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);date=d.toISOString().slice(0,10);}
    const p=points.at(-1);
    if(p?.date===date){p.high=Math.max(p.high,r.price);p.low=Math.min(p.low,r.price);p.close=r.price;p.count+=r.count;}
    else points.push({date,open:r.price,high:r.price,low:r.price,close:r.price,count:r.count});
  }
  return points;
}
function csvCell(value:unknown){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s=`'${s}`;return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
export function historicalCsv(archive:HistoricalArchive=historicalArchive){
  const columns=['record_id','product_key','name','reported_specification','category','platform','publication_date','published_at','retrieved_at','price','currency','quote_type','source','evidence_url','merchant_url','price_evidence','conditions','article_context','effective_date','date_basis','verification','availability','data_mode'];
  return '\uFEFF'+columns.join(',')+'\r\n'+archive.records.map(r=>[r.id,r.productKey,r.name,r.reportedSpecification,r.category,r.platform,r.publicationDate,r.publishedAt,r.observedAt,r.price,r.currency,r.quoteType,r.source,r.sourceUrl,r.merchantUrl,r.priceEvidence,r.conditions,r.articleContext,'',r.dateBasis,r.verification,r.availability,'historical_article_archive'].map(csvCell).join(',')).join('\r\n')+'\r\n';
}
