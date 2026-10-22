import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const INDEX='datasets/history-index.json', OUTPUT='datasets/historical-prices.json';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const hardware=/内存|显卡|固态|SSD|硬盘|CPU|锐龙|酷睿|RTX\s*\d|RX\s*\d/i;
const pricing=/\d[\d,.]*\s*元|售价|到手价|优惠|史低|好价|直降|特惠|特价|低价|促销|大降|补贴/i;
const wholeSystem=/笔记本电脑|游戏本|轻薄本|一体机|主机|台式机电脑|台式电脑|整机|组装机|准系统|MacBook|Mac\s*mini|Mac\s*Pro|iPhone|iPad|手机|平板|主板|硬盘盒|显卡坞|扩展坞|扩展卡|转接卡|显卡支架|电池|PS[45]|Switch|裸机/i;

export function identifyPart(name) {
  if(/(?:\d+[GT])(?:B)?\s*[/／]\s*\d+[GT]|\d{4}\s*[/／]\s*\d{4}|\d+\s*G(?:B)?\s*[×x*]\s*\d+\s*[/／]\s*\d+\s*G/i.test(name))return null;
  if(/\b[AB]\d{3}\s*[/／]\s*[AB]\d{3}\b|\b(?:RTX|GTX|RX)\s*\d{3,4}\w*\s*[/／]\s*(?:(?:RTX|GTX|RX)\s*)?\d{3,4}|i[3579]-\d{4,5}[A-Z]*\s*[/／]\s*(?:i[3579]-)?\d{4,5}/i.test(name))return null;
  if(wholeSystem.test(name)||/(?:主板|水冷|电源|机箱).*(?:套装|组合)|(?:套装|组合).*(?:主板|水冷|电源|机箱)/.test(name))return null;
  if(/小新|拯救者|ThinkBook|ThinkPad|MateBook|MagicBook|\bNUC\b|YOGA|Swift|Surface|灵耀|ZenBook|VivoBook|战神|天选|枪神|RedmiBook|LEGION|Redolbook|ProMaster|暗影精灵|暗影骑士|幻\d{2}|魔霸|冰刃/i.test(name))return null;
  if(/笔记本/.test(name)&&!/笔记本内存|内存条/.test(name))return null;
  if(/[+＋]/.test(name)||(/套装|套餐|组合|套机/.test(name)&&!/内存|RAM|DDR[345]/i.test(name)))return null;
  const cpuModel=/\bi[3579][\s-]*\d{4,5}|\bR[3579][\s-]*\d{4}[A-Z]*/i.test(name);
  const gpuModel=/GeForce|RTX\s*\d{4}|GTX\s*\d{3,4}|Radeon|RX\s*\d{3,4}/i.test(name);
  if(cpuModel&&gpuModel)return null;
  const gpuBrand=/^(?:NVIDIA|英伟达|AMD|GeForce|RTX\b|GTX\b|RX\b|索泰|蓝宝石|讯景|华硕|七彩虹|影驰|技嘉|微星|msi|耕升|映众|盈通|撼讯|华擎|丽台|PNY|Intel|英特尔|迪兰|铭瑄|昂达|梅捷|瀚铠|蓝戟|ASL|翔升|艾尔莎|磐镭|摩尔线程|ZOTAC|Sapphire|XFX|ASUS|GIGABYTE|GALAX|EVGA)/i.test(name);
  if((/显卡/.test(name)||(gpuModel&&gpuBrand))&&!cpuModel)return 'gpu';
  if(/内存|RAM|DDR[345]/i.test(name)||(/灯条/.test(name)&&/\d+\s*G/i.test(name)))return 'memory';
  if(/固态|SSD|硬盘|HDD/i.test(name)&&!cpuModel)return 'storage';
  if(/^(?:英特尔|Intel|AMD|超威|超微|锐龙|Ryzen|酷睿|Core\b|Threadripper|CPU\b)/i.test(name)&&/CPU|处理器|锐龙|Ryzen|酷睿|Threadripper|Core\s*(?:i[3579]|Ultra)|\bi[3579]-\d{4,5}[A-Z]*/i.test(name))return 'cpu';
  return null;
}

export function historicalProductKey({sku,category,name,reportedSpecification,sourceUrl,cardIndex=0}){
  if(!sku)return `article-${hash(sourceUrl).slice(0,12)}-${cardIndex}`;
  const text=clean(`${name} ${reportedSpecification??''}`);
  const capacities=[...new Set([...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(G|T)(?:B)?(?=\b|[×x*])/ig)].map(m=>`${m[1]}${m[2].toUpperCase()}B`))].sort();
  const attributes=[category,...capacities];
  if(category==='gpu')attributes.push(clean(name.match(/(?:RTX|GTX)\s*\d{3,4}\s*(?:TI)?\s*(?:SUPER)?\s*D?|RX\s*\d{3,4}\s*(?:XTX|XT|GRE|GME)?|Arc\s*[AB]\d{3}/i)?.[0]??'model_unknown').toUpperCase().replaceAll(' ',''));
  if(category==='memory'){
    attributes.push(text.match(/DDR[345]/i)?.[0].toUpperCase()??'generation_unknown');
    attributes.push(text.match(/(?:DDR[345][\s-]*)(\d{4})/i)?.[1]??text.match(/\b(\d{4})\s*(?:MHz|MT\/?s)/i)?.[1]??'rate_unknown');
    attributes.push(text.match(/\d+(?:\.\d+)?\s*G(?:B)?\s*[×x*]\s*(\d+)/i)?.[1]??'sticks_unknown');
    attributes.push(text.match(/\bCL\s*(\d+)/i)?.[1]??'cl_unknown');
  }
  if(category==='cpu'){
    attributes.push(clean(name.match(/i[3579][\s-]*\d{4,5}[A-Z]*|\b\d{4}(?:X3D|XT|X|G|F)?\b/i)?.[0]??'model_unknown').toUpperCase().replaceAll(' ',''));
    attributes.push(/盒装/.test(text)?'boxed':/散片/.test(text)?'tray':'packaging_unknown');
  }
  return `jd-${sku}-${hash(attributes.join('|')).slice(0,10)}`;
}

export function parseHistoricalPrice(text) {
  const raw=clean(text).replaceAll(',','');
  // Ranges, starting prices, dollar conversions, deposits, installment amounts
  // and unit prices do not establish one complete product price.
  if(/约|起|[~～]|美元|美金|\$|定金|订金|每|\/|期|折|减|万|亿元|低至|最高|最低|不高于|不少于|不少|\(|（/.test(raw))return null;
  const match=raw.match(/^(?:券后|到手价?|补贴后|实付|现价|预售价?|领券后)?\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)\s*元?$/);
  const price=match?Number(match[1]):NaN;
  return Number.isFinite(price)&&price>0&&price<=1_000_000?price:null;
}

export function parseNewsIndex(html,{url,date}) {
  const $=load(html),candidates=[];
  if(!$('title').text().includes(`${date.slice(0,4)}年`))throw new Error('日历日期不匹配');
  let articles=0;
  $('.datel li').each((_,el)=>{
    const row=$(el),a=row.find('a.t'),title=clean(a.text()),href=a.attr('href');
    const publicationDate=clean(row.find('i').text()).slice(0,10);
    if(!href||!/^https:\/\/www\.ithome\.com\/[01]\/\d{3}\/\d{3}\.htm$/.test(href)||publicationDate!==date)return;articles++;
    if(hardware.test(title)&&pricing.test(title))candidates.push({title,url:href,publishedDate:publicationDate,indexUrl:url});
  });
  if(!articles)throw new Error('没有读取到与请求日一致的新闻条目');
  return {articles,candidates};
}

function canonicalMerchant(anchor) {
  const jd=anchor.attr('data-jdid');
  if(jd&&/^[1-9]\d{4,19}$/.test(jd))return {sku:jd,merchantUrl:`https://item.jd.com/${jd}.html`};
  const href=anchor.attr('href');
  if(!href)return {sku:null,merchantUrl:null};
  try {
    const u=new URL(href,'https://www.ithome.com');
    if(u.protocol!=='https:'||u.username||u.password)return {sku:null,merchantUrl:null};
    if(u.hostname==='item.jd.com'){
      const sku=u.pathname.match(/^\/([1-9]\d{4,19})\.html$/)?.[1];
      if(sku)return {sku,merchantUrl:`https://item.jd.com/${sku}.html`};
    }
    return {sku:null,merchantUrl:u.href};
  }catch{return {sku:null,merchantUrl:null};}
}

export function parseHistoricalArticle(html,{url,indexDate,observedAt=new Date().toISOString(),sha256=hash(html)}) {
  const $=load(html),paragraph=$('#paragraph');
  const time=clean($('#pubtime_baidu').text());
  const match=time.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/);
  if(!match||!paragraph.length)throw new Error('未取得正文或明确的文章发布时间');
  const publicationDate=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  const parsedDate=new Date(`${publicationDate}T00:00:00Z`);
  if(!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==publicationDate)throw new Error('原文日期无效');
  if(indexDate&&publicationDate!==indexDate)throw new Error('文章日期与新闻日历不一致；不把更新内容回填为旧日期');
  if(publicationDate<'2020-01-01'||publicationDate>today())throw new Error('文章日期超出范围');
  const sourceTitle=clean($('h1').first().text()||$('title').text().replace(/\s*-\s*IT之家$/,''));
  const publishedAt=`${publicationDate}T${match[4]}+08:00`;
  const context=paragraph.find('p').toArray().filter(el=>!$(el).hasClass('ad-tips')).map(el=>clean($(el).text()))
    .filter(text=>/优惠券|补贴|会员|PLUS|京喜|预售|满减|下单|到手价|限时|领取/.test(text)&&!/^京东 11\.11|^淘宝 11\.11/.test(text)).slice(0,4).join(' ').slice(0,140);
  const records=new Map();
  paragraph.find('.card').each((cardIndex,el)=>{
    const card=$(el),platform=clean(card.find('.mall-data').text());
    if(!['京东','天猫','淘宝','拼多多'].includes(platform))return;
    const name=clean(card.find('.card-name').text()),abstract=clean(card.find('.card-abstract').text());
    const category=identifyPart(name);
    if(!category)return;
    // A card listing several selectable capacities/speeds cannot be assigned to
    // one exact configuration merely because the item has a minimum price.
    if(/(?:\d+[GT])(?:B)?\s*[/／]\s*\d+[GT]|\d{4}\s*[/／]\s*\d{4}/i.test(name))return;
    const rawPrice=clean(card.find('.price').text()),price=parseHistoricalPrice(rawPrice);
    if(price===null)return;
    const {sku,merchantUrl}=canonicalMerchant(card.closest('a'));
    // Missing capacity or package attributes stay missing. Even a shared SKU is
    // separated when the reported capacity differs. Unlinked cards do not merge
    // products across articles.
    const productKey=historicalProductKey({sku,category,name,reportedSpecification:abstract,sourceUrl:url,cardIndex});
    const id=hash(`${url}:${platform}:${sku??''}:${name}:${abstract}:${price}`).slice(0,24);
    records.set(id,{id,productKey,name,reportedSpecification:abstract||null,category,platform,sku,merchantUrl,
      publicationDate,publishedAt,observedAt,price,currency:'CNY',source:'IT之家',sourceUrl:url,sourceTitle,
      quoteType:/券|到手|补贴|优惠|促销|秒杀|特惠|低价|直降/.test(rawPrice+' '+abstract+' '+sourceTitle)?'promotion':'reported_listing',
      priceEvidence:clean(card.text()),rawPrice,conditions:abstract||'商品卡片未完整说明优惠条件，需查看原文。',articleContext:context||null,
      effectiveDate:null,dateBasis:'article_publication',verification:'published_article_only',availability:'historical_unknown',sha256,
      note:'文章记载的历史报价；日期为原文标示发布时间，不证明当天成交、持续在售或当前可购买。商品卡片规格与优惠条件需结合原文核对。'});
  });
  return {publicationDate,sourceTitle,records:[...records.values()]};
}

async function readPage(url) {
  if(!url.startsWith('https://www.ithome.com/'))throw new Error('仅允许已核查的 IT之家公开来源');
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(response.status===429)throw new Error('RATE_LIMIT');
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>3_000_000)throw new Error('响应过大');
  const html=new TextDecoder('utf-8').decode(bytes);
  if(/<title>[^<]*(?:验证|Forbidden|Access Denied)/i.test(html))throw new Error('验证页面');
  return {html,sha256:hash(bytes),observedAt:new Date().toISOString()};
}
const save=(path,value)=>{mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(`${path}.tmp`,JSON.stringify(value,null,2)+'\n');renameSync(`${path}.tmp`,path);};
export async function collectHistory({indexPath=INDEX,output=OUTPUT,maxDays=60,maxArticles=100,scan=true}={}) {
  const state=existsSync(indexPath)?JSON.parse(readFileSync(indexPath,'utf8')):{pages:{},candidates:{}};
  const previous=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{records:[],articles:{}};
  let throttled=false,scanned=0,read=0,failedRequests=0,successfulRequests=0;
  if(scan){
    const days=[];for(let d=new Date('2020-01-01T00:00:00Z');d.toISOString().slice(0,10)<=today();d.setUTCDate(d.getUTCDate()+1))days.push(d.toISOString().slice(0,10));
    const missing=[...new Set([...days.slice(-2).reverse(),...days.filter(day=>state.pages[day]?.status!=='ok')])].slice(0,maxDays);
    // Revisit recent calendars for newly published articles, then resume the
    // oldest uninspected days. Existing article observations keep their dates.
    for(const date of missing){
      const url=`https://www.ithome.com/list/${date}.html`;
      try{const {html,sha256}=await readPage(url);const parsed=parseNewsIndex(html,{url,date});state.pages[date]={status:'ok',articles:parsed.articles,sha256};for(const c of parsed.candidates)state.candidates[c.url]=c;successfulRequests++;}
      catch(e){failedRequests++;state.pages[date]={status:'failed',error:e.message};if(e.message==='RATE_LIMIT'){throttled=true;break;}}
      scanned++;if(scanned%20===0)console.log(`[history] scanned ${scanned} calendar days`);
      await new Promise(r=>setTimeout(r,300));
    }
    save(indexPath,state);
  }
  const records=new Map(previous.records.filter(q=>identifyPart(q.name)===q.category).map(q=>[q.id,{...q,articleContext:q.articleContext?.slice(0,140)||null,productKey:q.sku?historicalProductKey(q):q.productKey}])),articles={...previous.articles};
  const successful=Object.entries(state.pages).filter(([,p])=>p.status==='ok').map(([d])=>d).sort();
  function snapshot(){return {version:1,updatedAt:new Date().toISOString(),description:'免费公开文章中的历史商品卡片报价；不是完整逐日市场价，不是成交记录。日期为原文标示的发布时间，真实生效日期未知。',
    records:[...records.values()].sort((a,b)=>a.publicationDate.localeCompare(b.publicationDate)||a.id.localeCompare(b.id)),articles,
    discovery:{scannedDays:successful.length,firstScannedDate:successful[0]??null,lastScannedDate:successful.at(-1)??null,candidates:Object.keys(state.candidates).length,checkedArticles:Object.keys(articles).length,scannedThisRun:scanned,checkedThisRun:read,failedRequestsThisRun:failedRequests,successfulRequestsThisRun:successfulRequests,throttled}};}
  const buckets=new Map();
  for(const c of Object.values(state.candidates).filter(c=>!articles[c.url]&&!wholeSystem.test(c.title))){
    const year=c.publishedDate.slice(0,4);if(!buckets.has(year))buckets.set(year,[]);buckets.get(year).push(c);
  }
  const candidates=[];
  while(candidates.length<maxArticles&&[...buckets.values()].some(b=>b.length)){
    for(const b of buckets.values()){if(b.length&&candidates.length<maxArticles)candidates.push(b.shift());}
  }
  let cursor=0,nextStart=0;
  async function worker(){
    while(cursor<candidates.length&&!throttled){
      const candidate=candidates[cursor++];
      // At most three requests in flight and at most two starts per second.
      const delay=Math.max(0,nextStart-Date.now());nextStart=Math.max(nextStart,Date.now())+500;
      await new Promise(r=>setTimeout(r,delay));
      if(throttled)break;
      try{
        const response=await readPage(candidate.url);
        const parsed=parseHistoricalArticle(response.html,{url:candidate.url,indexDate:candidate.publishedDate,...response});
        for(const q of parsed.records)if(!records.has(q.id))records.set(q.id,q);
        articles[candidate.url]={status:'ok',recordCount:parsed.records.length,date:parsed.publicationDate,sha256:response.sha256};
        successfulRequests++;
      }catch(e){failedRequests++;articles[candidate.url]={status:'failed',error:e.message};if(e.message==='RATE_LIMIT')throttled=true;}
      read++;if(read%20===0){save(output,snapshot());console.log(`[history] checked ${read} articles / ${records.size} historical quotes`);}
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  const archive=snapshot();
  save(output,archive);console.log(`[history] saved ${archive.records.length} historical quotes, ${successful.length} calendar pages inspected`);return archive;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const args=process.argv.slice(2);if(args.some(a=>!['--articles-only'].includes(a)))throw new Error('用法：node scripts/collect-history.mjs [--articles-only]');
  collectHistory({scan:!args.includes('--articles-only')}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
