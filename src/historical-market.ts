import {historicalArchive, historicalCsv, historicalSeries, type HistoricalArchive, type HistoricalQuote} from './historical-prices';
import type {Dashboard, History, Interval, Product, ProductProfile} from './types';

// The archive's identity already distinguishes SKU and known configuration. Price
// types stay separate too; an ambiguous card never borrows a catalog identity.
export function historicalMarketId(record: HistoricalQuote) {
  return `history:${record.productKey}:${record.quoteType}`;
}
export const quoteTypeLabel = (type: HistoricalQuote['quoteType']) => type === 'promotion' ? '历史优惠报价' : '历史标示报价';
const DAY_MS = 86_400_000;
const brandNames = [
  ['三星', 'Samsung'], ['金士顿', 'Kingston'], ['芝奇', 'G.SKILL'], ['威刚', 'ADATA'], ['海盗船', 'Corsair'],
  ['英睿达', 'Crucial'], ['光威'], ['阿斯加特'], ['十铨', 'TeamGroup'], ['金百达'], ['影驰', 'GALAX'],
  ['华硕', 'ASUS'], ['微星', 'MSI'], ['技嘉', 'GIGABYTE'], ['七彩虹', 'Colorful'], ['索泰', 'ZOTAC'],
  ['耕升', 'GAINWARD'], ['映众', 'INNO3D'], ['丽台', 'Leadtek'], ['蓝宝石', 'Sapphire'], ['讯景', 'XFX'],
  ['英特尔', 'Intel', '酷睿'], ['AMD', '锐龙'], ['西部数据', '西数', 'WD'], ['致态'], ['铠侠', 'KIOXIA'],
  ['闪迪', 'SanDisk'], ['希捷', 'Seagate'], ['梵想'], ['爱国者'], ['雷克沙', 'Lexar'], ['浦科特', 'Plextor'],
];
function profileFor(record: HistoricalQuote): ProductProfile {
  const text = `${record.name} ${record.reportedSpecification || ''}`;
  const fields: ProductProfile['fields'] = [];
  const facets: ProductProfile['facets'] = {};
  const add = (key: string, label: string, value: string) => fields.push({key,label,value});
  if (record.category === 'memory') {
    const generation = text.match(/DDR[345]/i)?.[0].toUpperCase();
    const rate = text.match(/DDR[345][\s-]*(\d{4,5})(?!\d)/i)?.[1] || text.match(/(\d{4,5})\s*(?:MHz|MT\/s)/i)?.[1];
    const kit = text.match(/(\d+)\s*G(?:B)?\s*[×x*]\s*([1248])(?!\d)/i);
    const single = /单条|单根/.test(text);
    const capacity = kit ? Number(kit[1]) * Number(kit[2]) : Number(text.match(/(\d+)\s*G(?:B)?(?![a-z])/i)?.[1]) || undefined;
    if (capacity) facets.capacityGb = capacity;
    if (kit) facets.sticks = Number(kit[2]);
    else if (single) facets.sticks = 1;
    if (rate) facets.rateMt = Number(rate);
    add('generation','内存类型',generation || '原文未注明');
    add('capacity','总容量',capacity ? `${capacity}GB` : '原文未注明');
    add('rate','标称速率',rate ? `${rate} MT/s（按原文标称）` : '原文未注明');
    add('sticks','单条 / 套装',facets.sticks ? `${facets.sticks} 条${kit ? ` · ${kit[1]}GB × ${kit[2]}` : ''}` : '原文未注明');
    add('latency','时序',text.match(/CL\s*\d+/i)?.[0].toUpperCase() || '原文未注明');
  } else if (record.category === 'storage') {
    const capacity = text.match(/(\d+(?:\.\d+)?)\s*(T|G)(?:B)?(?![a-z])/i);
    if (capacity) facets.capacityGb = Number(capacity[1]) * (capacity[2].toUpperCase() === 'T' ? 1000 : 1);
    add('capacity','存储容量',capacity ? `${capacity[1]}${capacity[2].toUpperCase()}B` : '原文未注明');
    add('reported','规格补充',record.reportedSpecification || '原文未注明');
  } else if (record.category === 'gpu') {
    const vram = text.match(/(\d+)\s*G(?:B)?(?![a-z])/i);
    if (vram) facets.vramGb = Number(vram[1]);
    if (/Quadro|RTX\s*A\d{3,4}|RTX\s*\d{4}\s*Ada|Radeon\s*Pro|专业卡|专业显卡/i.test(text)) facets.gpuClass = 'professional';
    else if (/(?:GeForce\s*)?(?:RTX|GTX)\s*\d{3,4}|RX\s*\d{3,4}|Arc\s*[AB]\d{3}/i.test(text)) facets.gpuClass = 'consumer';
    add('gpuClass','显卡用途',facets.gpuClass === 'professional' ? '专业显卡' : facets.gpuClass === 'consumer' ? '消费级显卡' : '原文未注明');
    add('vram','显存容量',vram ? `${vram[1]}GB` : '原文未注明');
    add('reported','规格补充',record.reportedSpecification || '原文未注明');
  } else {
    add('packaging','盒装 / 散片',/散片/.test(text) ? '散片' : /盒装/.test(text) ? '盒装' : '原文未注明');
    add('reported','规格补充',record.reportedSpecification || '原文未注明');
  }
  add('sku','来源商品编号',record.sku || '未收录（按独立文章卡片保留）');
  return {kind:record.category,tierRank:9999,series:quoteTypeLabel(record.quoteType),fields,facets,
    analysis:{summary:'原文记载的规格与历史报价；未据此推断今天的售价或性能。',idealFor:[],tradeoffs:[],comparisons:[],references:[{label:'报价原文',url:record.sourceUrl}]}};
}
export function createHistoricalMarket(archive: HistoricalArchive = historicalArchive) {
  const groups = new Map<string, HistoricalQuote[]>();
  for (const record of archive.records) {
    const id = historicalMarketId(record);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(record);
  }
  for (const records of groups.values()) records.sort((a,b) => a.publicationDate.localeCompare(b.publicationDate) || a.price-b.price || a.id.localeCompare(b.id));
  const products: Product[] = [...groups].map(([id,records]) => {
    const lastDate = records.at(-1)!.publicationDate;
    const latest = records.find(r => r.publicationDate === lastDate)!;
    const lowest = records.reduce((a,b) => b.price < a.price ? b : a);
    return {id,category:latest.category,brand:brandNames.find(names=>names.some(name=>latest.name.toLowerCase().includes(name.toLowerCase())))?.[0] || '原文未注明品牌',
      name:latest.name,spec:[latest.reportedSpecification,quoteTypeLabel(latest.quoteType),latest.platform].filter(Boolean).join(' · '),
      releaseDate:null,currentPrice:latest.price,previousPrice:null,changePercent:null,lowPrice:lowest.price,lowDate:lowest.publicationDate,
      source:latest.source,updatedAt:lastDate,observationCount:records.length,dataMode:'historical',profile:profileFor(latest),
      historical:{quoteType:latest.quoteType,platform:latest.platform,sku:latest.sku,sourceUrl:latest.sourceUrl,conditions:latest.conditions}};
  });
  const dates = [...new Set(archive.records.map(r=>r.publicationDate))].sort();
  const names = [...new Set(archive.records.map(r=>r.source))];
  const dashboard: Dashboard = {mode:'historical',products,sources:names.map(name=>({name,observationCount:archive.records.filter(r=>r.source===name).length,latestDate:archive.records.filter(r=>r.source===name).map(r=>r.publicationDate).sort().at(-1)!})),
    summary:{productCount:products.length,observationCount:archive.records.length,recordedDays:dates.length,earliestDate:dates[0]||null,latestDate:dates.at(-1)||null,sourceCount:names.length}};
  const recordsFor = (id: string) => {
    const records = groups.get(id);
    if (!records) throw new Error('历史报价档案中没有这个型号。');
    return records;
  };
  function history(id: string, from: string, to: string, interval: Interval): History {
    const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if (!validDate(from) || !validDate(to) || from<'2020-01-01' || from>to || to>today) throw new Error('请选择 2020-01-01 至今天之间的有效日期区间。');
    if (!['day','week','month'].includes(interval)) throw new Error('无效的图表周期。');
    const records = recordsFor(id).filter(r=>r.publicationDate>=from && r.publicationDate<=to);
    const daily = historicalSeries(records,'day').map(p=>({date:p.date,price:p.low,source:records.find(r=>r.publicationDate===p.date && r.price===p.low)!.source}));
    const expectedDays = Math.round((Date.parse(to)-Date.parse(from))/DAY_MS)+1;
    const lowest = daily.reduce<History['daily'][number]|null>((a,b)=>!a||b.price<a.price?b:a,null);
    return {points:historicalSeries(records,interval),daily,coverage:{expectedDays,observedDays:daily.length,missingDays:expectedDays-daily.length,earliestDate:daily[0]?.date||null,latestDate:daily.at(-1)?.date||null},lowPrice:lowest?.price??null,lowDate:lowest?.date??null};
  }
  return {dashboard,recordsFor,history,csv:(id?:string|null)=>historicalCsv({...archive,records:id?recordsFor(id):archive.records})};
}
export const historicalMarket = createHistoricalMarket();
export function historicalMarketApi(url: URL): unknown {
  if (url.pathname === '/api/dashboard') return structuredClone(historicalMarket.dashboard);
  const match = /^\/api\/products\/([^/]+)\/(history|offers)$/.exec(url.pathname);
  if (!match) throw new Error('历史报价工作区没有这个接口。');
  const id = decodeURIComponent(match[1]);
  if (match[2] === 'offers') {
    const records = historicalMarket.recordsFor(id);
    const date = records.at(-1)!.publicationDate;
    return {offers:records.filter(r=>r.publicationDate===date).map(r=>({source:r.source,price:r.price,date:r.publicationDate,url:r.sourceUrl}))};
  }
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return historicalMarket.history(id,url.searchParams.get('from')||'2020-01-01',url.searchParams.get('to')||today,(url.searchParams.get('interval')||'week') as Interval);
}
const downloads = new Map<string,string>();
export function historicalMarketDownload(url: URL) {
  if (url.pathname !== '/api/export') throw new Error('历史报价工作区没有这个导出。');
  const key = url.searchParams.get('productId') || '';
  if (!downloads.has(key)) downloads.set(key,URL.createObjectURL(new Blob([historicalMarket.csv(key)],{type:'text/csv;charset=utf-8'})));
  return downloads.get(key)!;
}
