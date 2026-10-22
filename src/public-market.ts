import {publicArchive,quoteKindLabel,type PublicArchive,type PublicQuote} from './public-prices';
import {sourceBrand,sourceProfile} from './source-profile';
import {quoteHistory,summaryFor,type QuoteRow} from './quote-book';
import type {Dashboard,Interval,Product} from './types';
export const publicMarketId=(q:PublicQuote)=>`public:${q.productId}:${q.kind}:${encodeURIComponent(q.merchantUrl||'reference')}`;
export function createPublicMarket(archive:PublicArchive=publicArchive){
  const models=new Map(archive.products.map(p=>[p.id,p]));
  const groups=new Map<string,PublicQuote[]>();
  for(const q of archive.observations){const id=publicMarketId(q);if(!groups.has(id))groups.set(id,[]);groups.get(id)!.push(q);}
  const products:Product[]=[...groups].map(([id,records])=>{
    records.sort((a,b)=>a.date.localeCompare(b.date)||a.price-b.price);
    const latest=records.find(r=>r.date===records.at(-1)!.date)!;
    const low=records.reduce((a,b)=>b.price<a.price?b:a);
    const previousDay=new Date(latest.date+'T00:00:00Z');previousDay.setUTCDate(previousDay.getUTCDate()-1);
    const previous=records.find(r=>r.date===previousDay.toISOString().slice(0,10));
    const model=models.get(latest.productId)!;
    const {profile,conflict}=sourceProfile(model);
    profile.series=quoteKindLabel(latest.kind);
    return{id,category:model.category,brand:sourceBrand(model.name),name:model.name,spec:`${quoteKindLabel(latest.kind)} · ${latest.source}${latest.merchant?' · '+latest.merchant:''}`,releaseDate:null,currentPrice:latest.price,previousPrice:previous?.price??null,changePercent:previous?(latest.price/previous.price-1)*100:null,lowPrice:low.price,lowDate:low.date,source:latest.source,updatedAt:latest.date,observationCount:records.length,dataMode:'public',quoteBasis:latest.kind,evidenceUrl:latest.sourceUrl,specificationConflict:conflict,profile};
  });
  const rows=archive.observations.map(q=>({date:q.date,price:q.price,source:q.source}));
  const summary=summaryFor(products,rows);
  const dashboard:Dashboard={mode:'public',products,summary,sources:[...new Set(rows.map(r=>r.source))].map(name=>({name,observationCount:rows.filter(r=>r.source===name).length,latestDate:rows.filter(r=>r.source===name).map(r=>r.date).sort().at(-1)!}))};
  function recordsFor(id:string){const records=groups.get(id);if(!records)throw new Error('没有找到这个公开报价型号。');return records;}
  const quoteRows=(id:string):QuoteRow[]=>recordsFor(id).map(q=>({date:q.date,price:q.price,source:q.source,url:q.sourceUrl,conditions:q.conditions}));
  return{dashboard,recordsFor,quoteRows,history:(id:string,from:string,to:string,interval:Interval)=>quoteHistory(quoteRows(id),from,to,interval)};
}
export const publicMarket=createPublicMarket();
