import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = 'datasets/public-prices.json';
const clean = value => value.replace(/\s+/g, ' ').trim();
const absolute = (value, base) => {
  const url=new URL(value,base);
  if(url.protocol!=='https:'||url.username||url.password) throw new Error('来源链接必须为不含凭据的 HTTPS 地址');
  return url.href;
};
export const classifyGpu = (name, professional=false) => professional || /Quadro|RTX\s*(?:PRO|A\d)|Radeon\s*PRO/i.test(name) ? 'professional'
  : /GeForce|RTX\s*\d{4}|RX\s*\d{4}|Arc\s*[AB]\d{3}|MTT\s*S(?:30|50|70|80)\b/i.test(name) ? 'consumer' : 'unknown';
const chinaDate = date => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
export function parseAmount(value) {
  // Rounded “1.8万” labels do not establish an exact 18,000 yuan quote.
  const match = clean(value).replaceAll(',', '').match(/^[¥￥]?\s*(\d+(?:\.\d{1,2})?)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  return amount > 0 && amount <= 1_000_000 ? amount : null;
}

export function parseZolList(html, {url, category, professional = false}) {
  const $ = load(html);
  const products = [];
  $('#J_PicMode > li[data-follow-id]').each((_, element) => {
    const row = $(element), anchor = row.find('h3 a').first();
    const imageName = row.find('a.pic img').attr('alt');
    const name = clean(imageName || anchor.clone().children().remove().end().text());
    const href = anchor.attr('href');
    const id = row.attr('data-follow-id')?.match(/^p(\d+)$/)?.[1];
    if (!name || !href || !id) return;
    const quotes = [];
    const reference = parseAmount(row.find('.price-row .price-type').first().text());
    if (reference !== null) quotes.push({kind:'reference', price:reference, merchant:null, merchantUrl:null});
    row.find('.item-b2cprice a.itemsub-b2c').each((_, el) => {
      const a = $(el), amount = parseAmount(a.text());
      const link = a.attr('href');
      if (amount === null || !link) return;
      const merchantUrl = absolute(link, url);
      const parsed = new URL(merchantUrl);
      // Keep a canonical SKU link when the published link explicitly identifies it.
      const sku = parsed.searchParams.get('e')?.match(/^jd_(\d+)$/)?.[1]
        || (parsed.hostname === 'item.jd.com' ? parsed.pathname.match(/^\/(\d+)\.html$/)?.[1] : null);
      if(!sku)return;
      quotes.push({kind:'retailer_relay',price:amount,merchant:'京东（ZOL 转引）',merchantUrl:`https://item.jd.com/${sku}.html`});
    });
    if (quotes.length) products.push({id:`zol-${id}`,name,category,professional,gpuClass:category==='gpu'?classifyGpu(name,professional):null,url:absolute(href,url),listingUrl:url,fields:[],quotes,
      quoteEvidence:clean(row.find('.price-row').text()+' '+row.find('.item-b2cprice').text())});
  });
  if (!products.length) throw new Error('没有读取到有效产品报价；可能是验证页、结构变化或无报价页面');
  return products;
}

export function parseZolDetails(html) {
  const $ = load(html);
  const fields = [];
  $('.product-param-item p').each((_, el) => {
    const p = $(el), label = clean(p.find('span').first().text()).replace(/[:：]$/, '');
    const value = clean(p.clone().children('span').remove().end().text());
    if (label && value && !fields.some(f => f.label === label)) fields.push({label,value});
  });
  // No inferred release dates, timings, stick counts, or packaging.
  return fields;
}

export function parsePconlineList(html, {url,category,professional=false}) {
  const $ = load(html), products = [];
  $('#JlistItems > li').each((_,el) => {
    const row = $(el), a = row.find('a.item-title-name').first();
    const href = a.attr('href'), name = clean(a.text());
    const price = parseAmount(row.find('.price-now').first().text());
    const id = href?.match(/\/(\d+)\.html/)?.[1];
    if (!id || !name || !href || price === null) return;
    const fields = clean(row.find('.item-title-des').text()).split(/[；;]/).map(text => {
      const i=text.indexOf('：');return i>0 ? {label:text.slice(0,i),value:text.slice(i+1)} : null;
    }).filter(Boolean);
    products.push({id:`pconline-${id}`,name,category,professional,gpuClass:category==='gpu'?classifyGpu(name,professional):null,url:absolute(href,url),listingUrl:url,fields,
      quoteEvidence:clean(row.find('.price-now').text()),
      quotes:[{kind:'reference',price,merchant:null,merchantUrl:null}]});
  });
  if (!products.length) throw new Error('没有读取到有效产品报价；未将验证页或空页面当成成功');
  return products;
}

export function mergeArchive(previous, products, attempts, now = new Date()) {
  const day = chinaDate(now), observedAt = now.toISOString();
  const productMap = new Map((previous.products || []).map(p=>[p.id,p]));
  const records = new Map((previous.observations || []).map(r=>[r.id,r]));
  for (const product of products) {
    const {quotes,...metadata}=product;
    const existingProduct=productMap.get(product.id);
    productMap.set(product.id,{...existingProduct,...metadata,fields:metadata.fields.length?metadata.fields:existingProduct?.fields || []});
    for (const quote of quotes) {
      const id = `${product.id}:${day}:${quote.kind}:${quote.merchantUrl || 'reference'}`;
      const record = {id,productId:product.id,date:day,observedAt,currency:'CNY',...quote,
        source:product.id.startsWith('zol-') ? '中关村在线' : '太平洋电脑网',sourceUrl:product.listingUrl || product.url,
        evidence:product.quoteEvidence,listingSha256:product.listingSha256 || null,
        effectiveDate:null,availability:'unknown',verification:'source_page_only',
        conditions:'来源页展示的报价；未核实商家结算价、库存、会员、优惠券、补贴、税费及运费；不是成交记录。'};
      // Do not rewrite unchanged historical observations to make them look fresh.
      const existing=records.get(id);
      records.set(id,{...record,observedAt:existing?.price===record.price?existing.observedAt:record.observedAt});
    }
  }
  return {version:1,updatedAt:previous.updatedAt>observedAt?previous.updatedAt:observedAt,requestedHistoryStart:'2020-01-01',
    description:'公开页面报价观察档案。采集日期不是价格生效日期；参考价、转引报价均未确认为当前可购买价或成交价。无记录的日期不填补。',
    products:[...productMap.values()].sort((a,b)=>a.id.localeCompare(b.id)),
    observations:[...records.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),
    lastCollection:{observedAt,attempts,productsRead:products.length,successfulPages:attempts.filter(a=>a.status==='ok').length},
  };
}

async function fetchPage(url) {
  const response = await fetch(url, {headers:{'User-Agent':'Chipprice/1.0 (public product price research; https://github.com/newallansales-stack/-)'},signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 4_000_000) throw new Error('页面超过 4 MB');
  const head = new TextDecoder().decode(bytes.slice(0,3000));
  const charset = response.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]
    || head.match(/charset=["']?([\w-]+)/i)?.[1] || 'utf-8';
  const html = new TextDecoder(charset).decode(bytes);
  if (/service\.zol\.com\.cn\/checking|京东验证|captcha|人机验证/i.test(html.slice(0,5000))) throw new Error('验证页面，停止读取该页');
  return {html,sha256:createHash('sha256').update(bytes).digest('hex')};
}

export async function collectPublic({output=OUTPUT, pages=2, details=true, now=new Date()}={}) {
  const previous = existsSync(output) ? JSON.parse(readFileSync(output,'utf8')) : {products:[],observations:[]};
  const targets=[];
  for (const [slug,category] of [['memory','memory'],['vga','gpu'],['cpu','cpu'],['hard_drives','storage']]) {
    for(let page=1;page<=pages;page++) targets.push({provider:'zol',category,url:`https://detail.zol.com.cn/${slug}/${page===1?'':`${page}.html`}`});
  }
  targets.push({provider:'zol',category:'gpu',professional:true,url:'https://detail.zol.com.cn/vga/s5354/'});
  targets.push({provider:'pconline',category:'storage',url:'https://product.pconline.com.cn/dianziyingpan/'});
  targets.push({provider:'pconline',category:'memory',url:'https://product.pconline.com.cn/memory/'});
  targets.push({provider:'pconline',category:'gpu',url:'https://product.pconline.com.cn/vga/'});
  targets.push({provider:'pconline',category:'gpu',professional:true,url:'https://product.pconline.com.cn/pro_vga/'});
  const products = new Map(), attempts=[];
  // One request at a time, without login automation, challenge solving, or proxy changes.
  for(const target of targets) {
    try {
      const {html,sha256}=await fetchPage(target.url);
      const parsed=target.provider==='zol' ? parseZolList(html,target) : parsePconlineList(html,target);
      for(const p of parsed) products.set(p.id,{...p,listingSha256:sha256});
      attempts.push({url:target.url,status:'ok',productCount:parsed.length,sha256});
      console.log(`[public] ${target.url}: ${parsed.length} products`);
    } catch(error) {
      attempts.push({url:target.url,status:'failed',error:error.message});
      console.log(`[public] ${target.url}: ${error.message}`);
    }
  }
  if (details) {
    for(const product of products.values()) {
      if (!product.id.startsWith('zol-')) continue;
      // Main product pages supply independently labelled specifications.
      try {
        const {html,sha256}=await fetchPage(product.url);
        product.fields=parseZolDetails(html);
        product.specificationEvidence={url:product.url,sha256,observedAt:now.toISOString()};
      } catch(error) {
        product.fields=previous.products.find(p=>p.id===product.id)?.fields || [];
        product.specificationError=error.message;
      }
    }
  }
  if (!products.size) throw new Error('全部来源失败，保留此前数据，未写入空档案');
  const archive=mergeArchive(previous,[...products.values()],attempts,now);
  mkdirSync(dirname(resolve(output)),{recursive:true});
  const temporary=`${output}.tmp`;writeFileSync(temporary,JSON.stringify(archive,null,2)+'\n');renameSync(temporary,output);
  console.log(`[public] saved ${archive.products.length} models / ${archive.observations.length} observations`);
  return archive;
}

export async function enrichPublic(output=OUTPUT) {
  const archive=JSON.parse(readFileSync(output,'utf8'));
  const candidates=archive.products.filter(p=>p.id.startsWith('zol-')&&!p.fields.length);
  let index=0,completed=0;
  async function worker() {
    while(index<candidates.length) {
      const p=candidates[index++];
      try {
        const {html,sha256}=await fetchPage(p.url);
        p.fields=parseZolDetails(html);
        p.specificationEvidence={url:p.url,sha256,observedAt:new Date().toISOString()};
      } catch(error) {p.specificationError=error.message;}
      completed++;
      if(completed%20===0) console.log(`[public specifications] ${completed}/${candidates.length}`);
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  writeFileSync(`${output}.tmp`,JSON.stringify(archive,null,2)+'\n');renameSync(`${output}.tmp`,output);
  console.log(`[public specifications] ${archive.products.filter(p=>p.fields.length).length}/${archive.products.length} products have labelled specifications`);
}

if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const args=process.argv.slice(2);
  if(args.some(a=>!['--no-details','--one-page','--enrich-only'].includes(a))) throw new Error('参数：--no-details / --one-page / --enrich-only');
  (args.includes('--enrich-only')?enrichPublic():collectPublic({details:!args.includes('--no-details'),pages:args.includes('--one-page')?1:2})).catch(e=>{console.error(e.message);process.exitCode=1;});
}
