import {parse} from 'csv-parse/browser/esm/sync';
import {chinaToday,csvText,quoteHistory,summaryFor,validDate,type QuoteRow} from './quote-book';
import {sourceProfile} from './source-profile';
import type {Dashboard,Interval,Product} from './types';
export type LocalRecord={key:string;product_id:string;category:Product['category'];brand:string;name:string;spec:string;release_date:string;date:string;price:number;source:string;url:string;price_basis:'listing'|'promotion'|'transaction';conditions:string;currency:'CNY';data_mode:'local'};
const basisLabels={listing:'用户挂牌报价',promotion:'用户优惠报价',transaction:'用户成交记录（未独立核验）'};
let cache:LocalRecord[]=[];
let storageError='';
let database:Promise<IDBDatabase>|undefined;
export const localRecords=()=>cache;
export const localStorageError=()=>storageError;
function openDatabase(){
  database??=new Promise<IDBDatabase>((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('当前浏览器无法使用本机数据库，请使用正常浏览器窗口；公开数据仍可查看。'));return;}
    const request=indexedDB.open('chipprice-workspace',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('records',{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('无法打开本机数据库。'));
    request.onblocked=()=>reject(new Error('数据库被旧页面占用，请关闭其他看板标签后重试。'));
  });
  return database;
}
export async function loadLocalRecords(){
  try{
    const db=await openDatabase();
    cache=await new Promise<LocalRecord[]>((resolve,reject)=>{const request=db.transaction('records').objectStore('records').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('读取本机记录失败。'));});
    storageError='';
  }catch(error){storageError=error instanceof Error?error.message:'本机数据库不可用。';}
  return cache;
}
export function validateLocalRows(input:unknown[],existing:LocalRecord[]=[],today=chinaToday()):LocalRecord[]{
  if(!Array.isArray(input)||input.length===0||input.length>100000)throw new Error('每批须包含 1 至 100,000 条记录。');
  const products=new Map<string,string>();
  const fingerprint=(r:LocalRecord)=>JSON.stringify([r.category,r.brand,r.name,r.spec,r.release_date]);
  for(const r of existing)products.set(r.product_id,fingerprint(r));
  const seen=new Map<string,LocalRecord>();
  const text=(v:unknown,label:string,row:number,max:number,optional=false)=>{
    if(optional&&(v==null||v===''))return '';
    if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u001f\u007f]/.test(v))throw new Error(`第 ${row} 行：${label} 格式无效。`);
    return v.trim();
  };
  for(const [index,value] of input.entries()){
    const row=index+2;
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`第 ${row} 行不是有效记录。`);
    const raw=value as Record<string,unknown>;
    if(raw.data_mode!=null&&!['local','real','user_import'].includes(String(raw.data_mode)))throw new Error(`第 ${row} 行：公共档案或演示数据不能改作用户真实价格导入；请用原档案查看。`);
    if(raw.currency&&raw.currency!=='CNY')throw new Error(`第 ${row} 行：仅接收人民币 CNY，不自动换算。`);
    const id=text(raw.product_id,'product_id',row,100);
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id))throw new Error(`第 ${row} 行：型号编号只允许英文、数字、点、横线和下划线。`);
    const category=text(raw.category,'category',row,20) as LocalRecord['category'];
    if(!['memory','gpu','cpu','storage'].includes(category))throw new Error(`第 ${row} 行：品类须为 memory、gpu、cpu 或 storage。`);
    const priceString=String(raw.price??'').trim();
    if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(priceString)||Number(priceString)<=0||Number(priceString)>1000000)throw new Error(`第 ${row} 行：价格须为 0 至 1,000,000 之间的正数，最多两位小数。`);
    const date=text(raw.date,'date',row,10),release=text(raw.release_date,'release_date',row,10,true);
    if(!validDate(date)||date<'2020-01-01'||date>today||release&&(!validDate(release)||release>date))throw new Error(`第 ${row} 行：价格日期须在 2020 年至今天之间，且不早于已填的上市日期。未知上市日期请留空。`);
    const url=text(raw.url,'url',row,2000);
    try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error();}catch{throw new Error(`第 ${row} 行：请提供不含账号密码的 HTTPS 报价或成交证据链接。`);}
    const basis=raw.price_basis||'listing';
    if(!['listing','promotion','transaction'].includes(String(basis)))throw new Error(`第 ${row} 行：price_basis 须为 listing、promotion 或 transaction。`);
    const r:LocalRecord={key:'',product_id:id,category,brand:text(raw.brand,'brand',row,160),name:text(raw.name,'name',row,160),spec:text(raw.spec,'spec',row,500),release_date:release,date,price:Number(priceString),source:text(raw.source,'source',row,160),url,price_basis:basis as LocalRecord['price_basis'],conditions:text(raw.conditions,'conditions',row,2000,true),currency:'CNY',data_mode:'local'};
    r.key=JSON.stringify([id,r.price_basis,date,r.source,url]);
    const signature=fingerprint(r),previous=products.get(id);
    if(previous&&previous!==signature)throw new Error(`第 ${row} 行：${id} 与已有型号规格不一致。不同容量、条数、频率或包装请使用不同编号。`);
    products.set(id,signature);
    const duplicate=seen.get(r.key);
    if(duplicate&&JSON.stringify(duplicate)!==JSON.stringify(r))throw new Error(`第 ${row} 行：同批重复记录的价格或条件冲突，请先整理。`);
    seen.set(r.key,r);
  }
  return [...seen.values()];
}
export function parseLocalCsv(csv:string,existing:LocalRecord[]=cache){
  if(new TextEncoder().encode(csv).length>20*1024*1024)throw new Error('单批文件上限 20 MB，请分批导入。');
  const rows=parse(csv,{columns:true,bom:true,skip_empty_lines:true,trim:true,max_record_size:10000}) as unknown[];
  return validateLocalRows(rows,existing);
}
export async function saveLocalRecords(rows:LocalRecord[],replace=false){
  const validated=validateLocalRows(rows,replace?[]:cache);
  const merged=new Map((replace?[]:cache).map(r=>[r.key,r]));
  let added=0,updated=0;
  for(const r of validated){if(!merged.has(r.key))added++;else if(JSON.stringify(merged.get(r.key))!==JSON.stringify(r))updated++;merged.set(r.key,r);}
  const db=await openDatabase();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');if(replace)store.clear();for(const r of validated)store.put(r);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('保存失败，可能是浏览器存储空间不足；原有数据保持不变。'));tx.onabort=()=>reject(new Error('保存已中止，原有数据保持不变。'));});
  cache=[...merged.values()];storageError='';return{added,updated,total:cache.length};
}
export const localProductId=(r:LocalRecord)=>`local:${r.product_id}:${r.price_basis}`;
export function createLocalMarket(records:LocalRecord[]=cache){
  const groups=new Map<string,LocalRecord[]>();
  for(const r of records){const id=localProductId(r);if(!groups.has(id))groups.set(id,[]);groups.get(id)!.push(r);}
  const products:Product[]=[...groups].map(([id,rows])=>{
    rows.sort((a,b)=>a.date.localeCompare(b.date)||a.price-b.price);
    const latest=rows.find(r=>r.date===rows.at(-1)!.date)!,low=rows.reduce((a,b)=>b.price<a.price?b:a);
    const {profile,conflict}=sourceProfile({name:`${latest.name} ${latest.spec}`,category:latest.category,fields:[],url:latest.url});
    profile.series=basisLabels[latest.price_basis];
    return{id,category:latest.category,brand:latest.brand,name:latest.name,spec:latest.spec,releaseDate:latest.release_date||null,currentPrice:latest.price,previousPrice:null,changePercent:null,lowPrice:low.price,lowDate:low.date,source:latest.source,updatedAt:latest.date,observationCount:rows.length,dataMode:'local',quoteBasis:latest.price_basis,evidenceUrl:latest.url,specificationConflict:conflict,profile};
  });
  const rows=records.map(r=>({date:r.date,price:r.price,source:r.source}));
  const dashboard:Dashboard={mode:'local',products,summary:summaryFor(products,rows),sources:[...new Set(rows.map(r=>r.source))].map(name=>({name,observationCount:rows.filter(r=>r.source===name).length,latestDate:rows.filter(r=>r.source===name).map(r=>r.date).sort().at(-1)!}))};
  function recordsFor(id:string){const rows=groups.get(id);if(!rows)throw new Error('没有找到这个本机导入型号。');return rows;}
  const quoteRows=(id:string):QuoteRow[]=>recordsFor(id).map(r=>({date:r.date,price:r.price,source:r.source,url:r.url,conditions:r.conditions}));
  return{dashboard,recordsFor,quoteRows,history:(id:string,from:string,to:string,interval:Interval)=>quoteHistory(quoteRows(id),from,to,interval,products.find(p=>p.id===id)?.releaseDate)};
}
export const localColumns=['product_id','category','brand','name','spec','release_date','date','price','source','url','price_basis','conditions','currency','data_mode'];
export const localCsv=(records:LocalRecord[]=cache)=>csvText(localColumns,records.map(r=>localColumns.map(c=>r[c as keyof LocalRecord])));
export const localTemplate=()=>csvText(localColumns,[['请替换型号编号','memory','请替换品牌','请替换具体型号','32GB(16GB×2) DDR5-6000 CL36','','2020-01-01','','请填写原始来源','https://请替换证据链接','listing','优惠条件请据实填写','CNY','local']]);
export function workspaceBackup(favorites:string[]){return JSON.stringify({schema:'chipprice-workspace',version:1,exportedAt:new Date().toISOString(),records:cache,favorites},null,2);}
export function parseWorkspaceBackup(text:string){
  if(new TextEncoder().encode(text).length>32*1024*1024)throw new Error('备份上限 32 MB。');
  const value=JSON.parse(text);
  if(value?.schema!=='chipprice-workspace'||value.version!==1||!Array.isArray(value.records)||!Array.isArray(value.favorites)||value.favorites.length>10000||value.favorites.some((id:unknown)=>typeof id!=='string'||id.length>1000))throw new Error('这不是有效的芯价工作台备份。');
  return{records:value.records.length?validateLocalRows(value.records):[],favorites:[...new Set(value.favorites)] as string[]};
}
export async function restoreWorkspaceBackup(backup:ReturnType<typeof parseWorkspaceBackup>){
  // Restoring an older backup must not overwrite a later edit of the same quote.
  if(backup.records.length){
    const checked=validateLocalRows(backup.records,cache);
    const keys=new Set(cache.map(r=>r.key));
    const additions=checked.filter(r=>!keys.has(r.key));
    if(additions.length)await saveLocalRecords(additions);
  }
  return backup.favorites;
}
