import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {parse} from 'csv-parse/sync';
import {parseAmount,parseZolList,parseZolDetails,parsePconlineList,mergeArchive,classifyGpu,collectPublic} from '../scripts/collect-public.mjs';

// Deliberate unit fixtures; these amounts are never published as source observations.
const zolFixture=`<ul id="J_PicMode"><li data-follow-id="p123"><a class="pic"><img alt="FIXTURE DDR5 32GB(16GB×2) 6000 C36"></a><h3><a href="/memory/index123.shtml">FIXTURE <span>promo</span></a></h3><div class="price-row"><b class="price-type">111</b></div><div class="item-b2cprice"><a class="itemsub-b2c" href="https://union-click.jd.com/jdc?e=jd_123456789&amp;p=tracking">¥222</a><a class="itemsub-b2c" href="https://item.jd.com/987654321.html">¥1.8万</a></div></li></ul>`;
const target={url:'https://detail.zol.com.cn/memory/',category:'memory'};
const now=new Date('2026-10-21T04:00:00Z');

test('source parsers separate editorial reference prices from retailer relays and discard rounded amounts',()=>{
  for(const value of ['1.8万','￥100-200','暂无报价','-1','0','100.123','1e3']) assert.equal(parseAmount(value),null);
  assert.equal(parseAmount('￥1,234.50'),1234.5);
  const [p]=parseZolList(zolFixture,target);
  assert.equal(p.name,'FIXTURE DDR5 32GB(16GB×2) 6000 C36');
  assert.equal(p.quotes.length,2);
  assert.deepEqual(p.quotes.map(q=>[q.kind,q.price]),[['reference',111],['retailer_relay',222]]);
  assert.equal(p.quotes[1].merchantUrl,'https://item.jd.com/123456789.html');
  assert.equal(p.listingUrl,target.url);
  assert.throws(()=>parseZolList('<title>验证页面</title>',target),/没有读取/);
  assert.equal(classifyGpu('GeForce RTX 5090 D'),'consumer');
  assert.equal(classifyGpu('RTX PRO 6000'),'professional');
  assert.equal(classifyGpu('MTT S4000'),'unknown');
});

test('only explicitly labelled specifications are copied; no guessed sticks, timings or release dates',()=>{
  assert.deepEqual(parseZolDetails('<ul class="product-param-item"><li><p><span>容量：</span>32GB</p></li></ul>'),[{label:'容量',value:'32GB'}]);
  assert.deepEqual(parseZolDetails('<h1>DDR5 6000</h1>'),[]);
  const html='<ul id="JlistItems"><li><a class="item-title-name" href="/pro_vga/nvidia/123.html">FIXTURE PRO</a><span class="item-title-des">显存容量：24GB；显存类型：GDDR6；</span><div class="price-now">￥333</div></li></ul>';
  const [p]=parsePconlineList(html,{url:'https://product.pconline.com.cn/pro_vga/',category:'gpu',professional:true});
  assert.equal(p.gpuClass,'professional');assert.equal(p.fields[0].value,'24GB');
  assert.equal(p.quotes[0].kind,'reference');assert.equal(p.quotes[0].merchantUrl,null);
  assert.equal(p.releaseDate,undefined);
});

test('archive merge is idempotent within a day, records actual later observations and preserves failures and gaps',()=>{
  const products=parseZolList(zolFixture,target);
  const first=mergeArchive({},products,[{url:target.url,status:'ok'}],now);
  const same=mergeArchive(first,products,[],new Date('2026-10-21T05:00:00Z'));
  assert.equal(same.observations.length,2);
  assert.equal(same.observations[0].observedAt,first.observations[0].observedAt);
  const later=mergeArchive(same,products,[{url:'https://example.com',status:'failed',error:'403'}],new Date('2026-10-24T04:00:00Z'));
  assert.equal(later.observations.length,4);
  assert.deepEqual([...new Set(later.observations.map(q=>q.date))],['2026-10-21','2026-10-24']);
  assert(later.observations.every(q=>q.effectiveDate===null&&q.availability==='unknown'&&q.verification==='source_page_only'));
  assert(later.observations.every(q=>q.sourceUrl===target.url));
  const failed=mergeArchive(later,[],[{url:target.url,status:'failed'}],now);
  assert.equal(failed.observations.length,4);
});

test('a completely failed live collection cannot overwrite the saved archive or refresh old observation dates',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'public-quotes-failure-'));
  const path=join(directory,'archive.json'),original=JSON.stringify(mergeArchive({},parseZolList(zolFixture,target),[],now));
  writeFileSync(path,original);
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response('Unavailable',{status:503});
  try {
    await assert.rejects(collectPublic({output:path,pages:1,details:false,now:new Date('2026-10-24T04:00:00Z')}),/全部来源失败/);
    assert.equal(readFileSync(path,'utf8'),original);
  } finally {globalThis.fetch=previousFetch;rmSync(directory,{recursive:true,force:true});}
});

async function loadUtilities(archive) {
  const source=readFileSync(new URL('../src/public-prices.ts',import.meta.url),'utf8').replace("import archiveJson from '../datasets/public-prices.json';",`const archiveJson=${JSON.stringify(archive)};`);
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('archive weekly candles use only observed dates and exports retain uncertainty and source URLs',async()=>{
  const archive=mergeArchive({},parseZolList(zolFixture,target),[],now);
  const {archiveSeries,archiveCsv}=await loadUtilities(archive);
  const base=archive.observations[0];
  const quotes=[{...base,date:'2020-01-01',price:300},{...base,date:'2020-01-03',price:200},{...base,date:'2020-01-19',price:250}];
  assert.deepEqual(archiveSeries(quotes,'week'),[
    {date:'2019-12-30',open:300,high:300,low:200,close:200,count:2},
    {date:'2020-01-13',open:250,high:250,low:250,close:250,count:1},
  ]);
  assert.equal(archiveSeries([],'week').length,0);
  const rows=parse(archiveCsv(),{columns:true,bom:true,skip_empty_lines:true});
  assert.equal(rows.length,2);
  for(const row of rows){assert.equal(row.data_mode,'public_quote_archive');assert.equal(row.verification,'source_page_only');assert.equal(row.effective_date,'');assert.equal(row.availability,'unknown');assert.equal(row.evidence_url,target.url);}
  assert.deepEqual(new Set(rows.map(r=>r.quote_kind)),new Set(['reference','retailer_relay']));
});

test('published archive contains factual source observations with explicit limitations, distinct IDs and no fabricated backfill',()=>{
  const archive=JSON.parse(readFileSync(new URL('../datasets/public-prices.json',import.meta.url),'utf8'));
  const ids=new Set(archive.products.map(p=>p.id));
  assert.equal(ids.size,archive.products.length);
  assert(archive.products.length>0);assert(archive.observations.length>0);
  assert.equal(new Set(archive.observations.map(q=>q.id)).size,archive.observations.length);
  for(const p of archive.products){assert(p.url.startsWith('https://'));assert(!Object.hasOwn(p,'target'));assert(!Object.hasOwn(p,'launch'));}
  for(const q of archive.observations){
    assert(ids.has(q.productId));assert(['reference','retailer_relay'].includes(q.kind));assert.equal(q.currency,'CNY');
    assert.equal(q.verification,'source_page_only');assert.equal(q.effectiveDate,null);assert.equal(q.availability,'unknown');assert(q.conditions.includes('不是成交记录'));
    assert(Number.isFinite(q.price)&&q.price>0);assert(q.sourceUrl.startsWith('https://'));
    assert(q.date>='2020-01-01');assert.equal(q.date,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(q.observedAt)));
    if(q.kind==='retailer_relay')assert(q.merchantUrl.startsWith('https://'));
  }
});
