import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parse} from 'csv-parse/sync';
import {openDatabase} from '../server/database.mjs';
import {importRecords} from '../server/prices.mjs';

const archive=JSON.parse(readFileSync(new URL('../datasets/historical-prices.json',import.meta.url),'utf8'));
function moduleUrl(source) {
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const historyUrl=moduleUrl(readFileSync(new URL('../src/historical-prices.ts',import.meta.url),'utf8').replace("import json from '../datasets/historical-prices.json';",`const json=${JSON.stringify(archive)};`));
const marketUrl=moduleUrl(readFileSync(new URL('../src/historical-market.ts',import.meta.url),'utf8').replace("from './historical-prices'",`from '${historyUrl}'`));
const {createHistoricalMarket,historicalMarket,historicalMarketId}=await import(marketUrl);
const sample=archive.records[0];
const fixture=records=>({...archive,records});

test('overview includes every historical article quote without converting it into a catalog price',()=>{
  const {dashboard,recordsFor}=historicalMarket;
  assert.equal(dashboard.mode,'historical');
  assert.equal(dashboard.summary.observationCount,archive.records.length);
  assert.equal(dashboard.products.length,new Set(archive.records.map(historicalMarketId)).size);
  assert.equal(dashboard.summary.recordedDays,new Set(archive.records.map(r=>r.publicationDate)).size);
  for(const p of dashboard.products) {
    assert(p.id.startsWith('history:'));
    assert.equal(p.releaseDate,null,'first quotation is not a verified launch date');
    assert.equal(p.changePercent,null,'sparse old articles must not imply a daily change');
    assert.equal(p.previousPrice,null);
    assert.equal(p.observationCount,recordsFor(p.id).length);
    assert.equal(p.dataMode,'historical');
    assert(p.historical.sourceUrl.startsWith('https://www.ithome.com/'));
    assert(!Object.hasOwn(p,'target'));
    assert(!Object.hasOwn(p,'launch'));
  }
});

test('price types, exact configurations, and source card identities remain independent',()=>{
  const same={...sample,productKey:'sku-config-a',quoteType:'reported_listing'};
  const other={...same,id:'coupon',quoteType:'promotion',price:1};
  const config={...same,id:'different-kit',productKey:'sku-config-b',price:2};
  const market=createHistoricalMarket(fixture([same,other,config]));
  assert.equal(market.dashboard.products.length,3);
  assert.equal(market.dashboard.products.find(p=>p.id===historicalMarketId(same)).lowPrice,same.price);
  assert.deepEqual(market.recordsFor(historicalMarketId(other)),[other]);
  assert.throws(()=>market.recordsFor('kingston-ddr5-32-6000'),/没有这个型号/);
});

test('latest historical quote uses the last publication day, not retrieval date or the all-time minimum',()=>{
  const records=[
    {...sample,id:'old',publicationDate:'2020-01-03',price:100},
    {...sample,id:'new-high',publicationDate:'2021-02-01',price:300},
    {...sample,id:'new-low',publicationDate:'2021-02-01',price:200},
  ];
  const market=createHistoricalMarket(fixture(records.reverse()));
  const p=market.dashboard.products[0];
  assert.equal(p.currentPrice,200);assert.equal(p.updatedAt,'2021-02-01');
  assert.equal(p.lowPrice,100);assert.equal(p.lowDate,'2020-01-03');
  const history=market.history(p.id,'2020-01-01','2021-02-28','week');
  assert.equal(history.daily.length,2);assert.equal(history.points.length,2);
  assert.equal(history.points[1].count,2);assert.equal(history.points[1].close,200);
  assert.equal(history.coverage.expectedDays,425);
  assert.equal(history.coverage.missingDays,423);
  assert.throws(()=>market.history(p.id,'2020-02-30','2021-01-01','week'),/有效日期/);
  assert.throws(()=>market.history(p.id,'2020-01-01','2021-01-01','year'),/无效/);
  assert.equal(market.history(p.id,'2020-06-01','2020-07-01','week').points.length,0);
});

test('source specifications never fill unknown stick count, latency, or rate from a similar catalog model',()=>{
  const unknown=createHistoricalMarket(fixture([{...sample,category:'memory',name:'FIXTURE DDR4 16GB 内存',reportedSpecification:'京东优惠'}])).dashboard.products[0];
  assert.equal(unknown.profile.facets.sticks,undefined);
  assert.equal(unknown.profile.facets.rateMt,undefined);
  assert.equal(unknown.profile.fields.find(f=>f.key==='latency').value,'原文未注明');
  const kit=createHistoricalMarket(fixture([{...sample,category:'memory',name:'FIXTURE DDR4-3200 32GB(16GB×2) CL16'}])).dashboard.products[0];
  assert.equal(kit.profile.facets.capacityGb,32);assert.equal(kit.profile.facets.sticks,2);assert.equal(kit.profile.facets.rateMt,3200);
  assert.equal(kit.profile.fields.find(f=>f.key==='latency').value,'CL16');
  const supplement=createHistoricalMarket(fixture([{...sample,category:'memory',name:'FIXTURE 内存套装',reportedSpecification:'DDR4-3600 16GB×2 CL18'}])).dashboard.products[0];
  assert.equal(supplement.profile.facets.capacityGb,32);assert.equal(supplement.profile.facets.sticks,2);assert.equal(supplement.profile.facets.rateMt,3600);
  assert.equal(supplement.profile.fields.find(f=>f.key==='latency').value,'CL18');
});

test('Samsung 980 PRO 1TB retains both dated quotes, sparse week bars and original conditions',()=>{
  const p=historicalMarket.dashboard.products.find(p=>p.historical.sku==='100008757393');
  assert(p);
  const records=historicalMarket.recordsFor(p.id);
  assert.deepEqual(records.map(r=>[r.publicationDate,r.price]),[['2022-06-01',1099],['2023-05-08',559]]);
  const h=historicalMarket.history(p.id,'2020-01-01','2026-10-21','week');
  assert.equal(h.points.length,2);assert.equal(h.lowPrice,559);
  assert.equal(p.currentPrice,559);assert.equal(p.updatedAt,'2023-05-08');
  assert.equal(records[1].conditions,'0.559 元 / GB');
});

test('market export preserves historical evidence fields and cannot be imported as real transactions',()=>{
  const p=historicalMarket.dashboard.products.find(p=>p.historical.sku==='100008757393');
  const rows=parse(historicalMarket.csv(p.id),{bom:true,columns:true,skip_empty_lines:true});
  assert.equal(rows.length,2);
  assert(rows.every(r=>r.data_mode==='historical_article_archive' && r.date_basis==='article_publication' && r.verification==='published_article_only' && !r.effective_date));
  assert(rows.every(r=>r.evidence_url && r.price_evidence && r.conditions));
  const db=openDatabase(':memory:');
  try{assert.throws(()=>importRecords(db,rows,{today:'2026-10-21'}),/不可导入/);}finally{db.close();}
});

test('historical market API and downloads work without an HTTP backend, and respect read-only and abort semantics',async()=>{
  const source=readFileSync(new URL('../src/api.ts',import.meta.url),'utf8')
    .replace("import.meta.env.VITE_STANDALONE === 'true'",'false')
    .replace("from './historical-market'",`from '${marketUrl}'`);
  const api=await import(moduleUrl(source));
  const previous=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Unexpected HTTP request');};
  try{
    const dashboard=await api.api('/api/dashboard?mode=historical');
    const p=dashboard.products.find(p=>p.historical.sku==='100008757393');
    const path=`/api/products/${encodeURIComponent(p.id)}`;
    const h=await api.api(`${path}/history?mode=historical&interval=week&from=2020-01-01&to=2026-10-21`);
    assert.equal(h.points.length,2);
    const {offers}=await api.api(`${path}/offers?mode=historical`);
    assert.equal(offers.length,1);assert.equal(offers[0].date,'2023-05-08');assert.equal(offers[0].price,559);
    assert(offers[0].url.startsWith('https://www.ithome.com/'));
    await assert.rejects(api.api('/api/dashboard?mode=historical',{method:'POST'}),/仅供读取/);
    const controller=new AbortController();controller.abort();
    await assert.rejects(api.api('/api/dashboard?mode=historical',{signal:controller.signal}),{name:'AbortError'});
    const link=api.downloadHref(`/api/export?mode=historical&productId=${encodeURIComponent(p.id)}`);
    assert.equal(link,api.downloadHref(`/api/export?mode=historical&productId=${encodeURIComponent(p.id)}`));
    const csv=await (await previous(link)).text();
    assert.equal(parse(csv,{bom:true,columns:true,skip_empty_lines:true}).length,2);
    URL.revokeObjectURL(link);
  }finally{globalThis.fetch=previous;}
});
