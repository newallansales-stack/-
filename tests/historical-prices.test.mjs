import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import ts from 'typescript';
import {parse}from'csv-parse/sync';
import {identifyPart,parseHistoricalPrice,parseNewsIndex,parseHistoricalArticle,historicalProductKey}from'../scripts/collect-history.mjs';

const url='https://www.ithome.com/0/123/456.htm';
const observedAt='2026-10-21T08:00:00Z';
function fixture({date='2020/1/9 18:20:02',name='FIXTURE DDR4 3200 32GB(16GB×2)',price='券后299元',mall='京东',abstract='1月10日10:00开始；下方领券',sku='123456789'}={}){
  return `<html><head><title>FIXTURE 价格资料 - IT之家</title></head><body><h1>FIXTURE 价格资料</h1><span id="pubtime_baidu">${date}</span><div id="paragraph"><p>领取优惠券后下单，须核对条件。</p><a href="https://item.jd.com/${sku}.html" data-jdid="${sku}"><span class="card"><span class="mall-data">${mall}</span><span class="card-name">${name}</span><span class="card-abstract">${abstract}</span><span class="price">${price}</span></span></a></div><div class="related_post"><span class="card"><span class="mall-data">京东</span><span class="card-name">FIXTURE SSD 1TB</span><span class="price">999元</span></span></div></body></html>`;
}

test('historical parts filter rejects complete computers, bundles and accessory enclosures',()=>{
  for(const name of ['联想LEGION Y9000X 15.6英寸(i7-9750H 32G 1T)','联想 AIO逸 23.8英寸 (六核i5-9400T 8G 512G 2G独显 )','武极 新酷睿i5 10400/GTX1660S/256G','七彩虹ProMaster H1 十代i7-10700 RTX 3080','惠普暗影精灵6 锐龙版','AMD 锐龙 5600G 电脑主机','Intel i5-12400F+主板套装','联想小新Pro13锐龙版','USB 固态硬盘盒','华擎 M.2 SSD扩展卡','华硕天选RTX4060笔记本','Intel Arc A770 / A750 显卡8G'])assert.equal(identifyPart(name),null,name);
  assert.equal(identifyPart('影驰 星曜16G RGB灯条'),'memory');
  assert.equal(identifyPart('威刚 DDR4-3600 8G×2 内存套装'),'memory');
  assert.equal(identifyPart('索泰GTX1660Super X-GAMING OC'),'gpu');
  assert.equal(identifyPart('AMD 锐龙 3990X CPU'),'cpu');
  assert.equal(identifyPart('爱国者 4TB 固态硬盘'),'storage');
  assert.equal(identifyPart('铭凡 DEG1 显卡扩展坞'),null);
});

test('historical identities ignore marketing wording while separating SKU, capacity, memory kit and processor packaging',()=>{
  const base={sku:'123456789',category:'storage',name:'三星 980 PRO SSD 1T',reportedSpecification:'0.559 元 / GB',sourceUrl:url};
  assert.equal(historicalProductKey(base),historicalProductKey({...base,name:'三星 980 PRO 1TB SSD 固态硬盘',reportedSpecification:'M.2 接口 (NVMe 协议 PCIe 4.0 x4)'}));
  assert.notEqual(historicalProductKey(base),historicalProductKey({...base,sku:'987654321'}));
  assert.notEqual(historicalProductKey(base),historicalProductKey({...base,name:'三星 980 PRO 2TB SSD'}));
  const cpu={...base,category:'cpu',name:'Intel i5-12400F 盒装',reportedSpecification:null};
  assert.notEqual(historicalProductKey(cpu),historicalProductKey({...cpu,name:'Intel i5-12400F 散片'}));
});

test('historical prices reject rounded, converted, deposit, unit, installment and selectable starting prices',()=>{
  for(const raw of ['约299元','299元起','99美元','定金100元','100元/件','12期99元','直降100元','1.8万元','299元（需购买2件）','低至299元','299-399元'])assert.equal(parseHistoricalPrice(raw),null,raw);
  assert.equal(parseHistoricalPrice('券后1,099元'),1099);
  assert.equal(parseHistoricalPrice('299.50 元'),299.5);
});

test('calendar discovery records only the requested date and publisher article links',()=>{
  const html='<title>2020年01月09日 - IT之家</title><ul class="datel"><li><a class="t" href="https://www.ithome.com/0/123/456.htm">DDR4内存 299元</a><i>2020-01-09 18:00</i></li><li><a class="t" href="https://untrusted.example/a">SSD 99元</a><i>2020-01-09</i></li></ul>';
  const r=parseNewsIndex(html,{url:'https://www.ithome.com/list/2020-01-09.html',date:'2020-01-09'});
  assert.equal(r.articles,1);assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].publishedDate,'2020-01-09');
  assert.throws(()=>parseNewsIndex(html,{url:'',date:'2021-01-09'}),/日期不匹配/);
});

test('historical extraction preserves publication versus retrieval dates and future offer conditions without claiming a sale date',()=>{
  const r=parseHistoricalArticle(fixture(),{url,indexDate:'2020-01-09',observedAt});
  assert.equal(r.records.length,1);const q=r.records[0];
  assert.equal(q.price,299);assert.equal(q.publicationDate,'2020-01-09');assert.equal(q.observedAt,observedAt);
  assert.equal(q.dateBasis,'article_publication');assert.equal(q.effectiveDate,null);assert.equal(q.verification,'published_article_only');
  assert(q.conditions.includes('1月10日'));assert.equal(q.merchantUrl,'https://item.jd.com/123456789.html');
  assert.equal(q.quoteType,'promotion');assert.equal(q.availability,'historical_unknown');
  assert.throws(()=>parseHistoricalArticle(fixture(),{url,indexDate:'2021-01-09',observedAt}),/日期与新闻日历不一致/);
  assert.equal(parseHistoricalArticle(fixture({mall:'亚马逊美国'}),{url,observedAt}).records.length,0);
  assert.equal(parseHistoricalArticle(fixture({name:'DDR4 16GB/32GB 3200/3600 内存'}),{url,observedAt}).records.length,0);
  const other=parseHistoricalArticle(fixture({name:'FIXTURE DDR4 3200 32GB(32GB×1)'}),{url,observedAt}).records[0];
  assert.notEqual(q.productKey,other.productKey,'same total capacity but different stick counts must not merge');
});

async function utilities(){
  const text=readFileSync(new URL('../src/historical-prices.ts',import.meta.url),'utf8').replace("import json from '../datasets/historical-prices.json';",'const json={records:[]};');
  const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('historical weekly aggregation leaves empty weeks absent and CSV preserves the article date basis',async()=>{
  const {historicalSeries,historicalCsv}=await utilities();
  const base=parseHistoricalArticle(fixture(),{url,observedAt}).records[0];
  const records=[{...base,publicationDate:'2020-01-01',price:300},{...base,publicationDate:'2020-01-03',price:200},{...base,publicationDate:'2020-01-19',price:250}];
  assert.deepEqual(historicalSeries(records,'week'),[{date:'2019-12-30',open:300,high:300,low:200,close:200,count:2},{date:'2020-01-13',open:250,high:250,low:250,close:250,count:1}]);
  const rows=parse(historicalCsv({records:[base]}),{columns:true,bom:true,skip_empty_lines:true});
  assert.equal(rows[0].data_mode,'historical_article_archive');assert.equal(rows[0].effective_date,'');assert.equal(rows[0].publication_date,'2020-01-09');assert.equal(rows[0].retrieved_at,observedAt);assert.equal(rows[0].verification,'published_article_only');
});

test('published historical records have traceable article evidence and cannot be current-price or transaction assertions',()=>{
  const archive=JSON.parse(readFileSync(new URL('../datasets/historical-prices.json',import.meta.url),'utf8'));
  const ids=new Set();
  for(const r of archive.records){
    assert(!ids.has(r.id));ids.add(r.id);
    assert.equal(identifyPart(r.name),r.category,r.name);
    assert(r.sourceUrl.startsWith('https://www.ithome.com/'));assert(r.priceEvidence);assert(r.sourceTitle);
    assert(Number.isFinite(r.price)&&r.price>0);assert.equal(r.currency,'CNY');
    assert.equal(r.effectiveDate,null);assert.equal(r.dateBasis,'article_publication');assert.equal(r.verification,'published_article_only');assert.equal(r.availability,'historical_unknown');
    assert.equal(r.publicationDate,r.publishedAt.slice(0,10));assert(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.observedAt))>=r.publicationDate);
  }
});
