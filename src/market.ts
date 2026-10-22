import snapshotJson from './standalone/snapshot.json';
import {publicArchive} from './public-prices';
import {publicMarket} from './public-market';
import {historicalArchive} from './historical-prices';
import {historicalMarket,historicalMarketApi} from './historical-market';
import {createLocalMarket,loadLocalRecords,localRecords,localCsv} from './local-data';
import {chinaToday,csvText,summaryFor,type QuoteRow} from './quote-book';
import type {Dashboard,Interval,Product} from './types';

const catalog=(snapshotJson as unknown as {dashboard:Dashboard}).dashboard.products.map(p=>({...p,dataMode:'catalog' as const}));
export function unifiedDashboard():Dashboard{
  const local=createLocalMarket();
  const products=[...publicMarket.dashboard.products,...historicalMarket.dashboard.products,...catalog,...local.dashboard.products];
  const rows:QuoteRow[]=[...publicArchive.observations.map(q=>({date:q.date,price:q.price,source:q.source})),...historicalArchive.records.map(q=>({date:q.publicationDate,price:q.price,source:q.source})),...localRecords().map(q=>({date:q.date,price:q.price,source:q.source}))];
  return{mode:'market',products,summary:summaryFor(products,rows),sources:[...new Set(rows.map(r=>r.source))].map(name=>({name,observationCount:rows.filter(r=>r.source===name).length,latestDate:rows.filter(r=>r.source===name).map(r=>r.date).sort().at(-1)!}))};
}
export function priceBasis(product:Product){
  if(product.dataMode==='catalog')return '规格目录 · 无报价';
  if(product.dataMode==='historical')return product.profile?.series||'历史文章报价';
  if(product.dataMode==='public')return product.quoteBasis==='reference'?'网站参考价 · 非在售价':'转引电商报价 · 待商家核验';
  if(product.dataMode==='local')return product.profile?.series||'用户导入 · 未独立核验';
  return '用户收录价格';
}
export async function marketApi(url:URL):Promise<unknown>{
  await loadLocalRecords();
  const mode=url.searchParams.get('mode');
  const local=createLocalMarket();
  if(url.pathname==='/api/dashboard')return structuredClone(mode==='public'?publicMarket.dashboard:mode==='local'?local.dashboard:unifiedDashboard());
  const match=/^\/api\/products\/([^/]+)\/(history|offers)$/.exec(url.pathname);
  if(!match)throw new Error('市场总览没有这个接口。');
  const id=decodeURIComponent(match[1]);
  const product=unifiedDashboard().products.find(p=>p.id===id);
  if(!product)throw new Error('没有找到这个型号，请重新搜索。');
  if(product.dataMode==='historical'){const parsed=new URL(url);parsed.searchParams.set('mode','historical');return historicalMarketApi(parsed);}
  if(product.dataMode==='catalog'){
    const runtime=await import('./standalone/runtime');const parsed=new URL(url);parsed.searchParams.set('mode','catalog');return runtime.standaloneApi(parsed.pathname+parsed.search);
  }
  const book=product.dataMode==='public'?publicMarket:local;
  if(match[2]==='offers'){
    const rows=book.quoteRows(id),day=rows.map(r=>r.date).sort().at(-1);
    return{offers:rows.filter(r=>r.date===day).map(r=>({source:r.source,price:r.price,date:r.date,url:r.url}))};
  }
  return book.history(id,url.searchParams.get('from')||'2020-01-01',url.searchParams.get('to')||chinaToday(),(url.searchParams.get('interval')||'week') as Interval);
}
export function marketCsv(id?:string|null){
  const products=unifiedDashboard().products.filter(p=>!id||p.id===id);
  if(id&&!products.length)throw new Error('没有找到要导出的型号。');
  const columns=['product_id','category','brand','name','spec','date','price','currency','price_basis','date_basis','source','evidence_url','conditions','verification','data_mode'];
  const rows:unknown[][]=[];
  for(const p of products){
    const base=[p.id,p.category,p.brand,p.name,p.spec];
    if(p.dataMode==='catalog')rows.push([...base,'','','CNY','catalog','','','','','unverified','market_quote_export']);
    if(p.dataMode==='public')for(const q of publicMarket.recordsFor(p.id))rows.push([...base,q.date,q.price,'CNY',q.kind,'source_page_observation',q.source,q.sourceUrl,q.conditions,q.verification,'market_quote_export']);
    if(p.dataMode==='historical')for(const q of historicalMarket.recordsFor(p.id))rows.push([...base,q.publicationDate,q.price,'CNY',q.quoteType,'article_publication',q.source,q.sourceUrl,q.conditions,q.verification,'market_quote_export']);
    if(p.dataMode==='local')for(const q of createLocalMarket().recordsFor(p.id))rows.push([...base,q.date,q.price,'CNY',q.price_basis,'user_reported',q.source,q.url,q.conditions,'user_supplied_unverified','market_quote_export']);
  }
  return csvText(columns,rows);
}
const downloads=new Map<string,string>();
export function marketDownload(url:URL){
  if(url.pathname!=='/api/export')throw new Error('无效的导出地址。');
  const id=url.searchParams.get('productId'),mode=url.searchParams.get('mode');
  const key=[mode,id,localRecords().length,localRecords().map(r=>`${r.key}:${r.price}`).join('|')].join(':');
  if(!downloads.has(key))downloads.set(key,URL.createObjectURL(new Blob([mode==='local'&&!id?localCsv():marketCsv(id)],{type:'text/csv;charset=utf-8'})));
  return downloads.get(key)!;
}
