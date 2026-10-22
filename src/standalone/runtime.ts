import snapshotJson from './snapshot.json';
import type { Dashboard, History, Interval, Mode, Offer, PricePoint } from '../types';

type DailyTuple = [date: string, price: number, count: number, source: number];
type CompactHistory = { releaseDate: string; lowPrice: number | null; lowDate: string | null; daily: DailyTuple[] };
type Snapshot = {
  version: number;
  generatedAt: string;
  date: string;
  dashboard: Dashboard;
  sourceNames: string[];
  histories: Record<string, CompactHistory>;
  offers: Record<string, {offers: Offer[]}>;
  status: unknown;
};
const snapshot = snapshotJson as unknown as Snapshot;
export const STATIC_MODE = true;
export const SNAPSHOT_GENERATED_AT = snapshot.generatedAt;
export const SNAPSHOT_DATE = snapshot.date;
const HISTORY_START = '2020-01-01';
const DAY_MS = 86_400_000;
const emptySummary = {
  productCount: 0, observationCount: 0, recordedDays: 0,
  earliestDate: null, latestDate: null, sourceCount: 0,
};
const downloadCache = new Map<string, string>();

function chinaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function periodStart(date: string, interval: Interval) {
  if (interval === 'month') return `${date.slice(0, 7)}-01`;
  if (interval === 'week') {
    const day = new Date(`${date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    return day.toISOString().slice(0, 10);
  }
  return date;
}
function parseUrl(url: string) {
  return new URL(url, 'https://standalone.invalid');
}
function parseMode(url: URL): Mode {
  const mode = url.searchParams.get('mode') ?? snapshot.dashboard.mode;
  if (mode !== 'demo' && mode !== 'real' && mode !== 'catalog') throw new Error('mode 必须为 catalog、demo 或 real');
  if (mode === 'demo' && snapshot.dashboard.mode === 'catalog') throw new Error('公开版已撤下模拟价格，请查看待核验的规格目录。');
  return mode;
}
function requireProduct(id: string, mode: Mode) {
  const product = mode !== 'real' ? snapshot.dashboard.products.find(item => item.id === id) : undefined;
  if (!product) throw new Error('公开目录中没有该型号的数据，请选择已有型号。');
  return product;
}
function historyFor(id: string, mode: Mode, url: URL): History {
  const product = requireProduct(id, mode);
  const record = mode === 'catalog' ? { releaseDate: product.releaseDate, lowPrice: null, lowDate: null, daily: [] as DailyTuple[] } : snapshot.histories[id];
  const interval = url.searchParams.get('interval') ?? 'week';
  if (!['day', 'week', 'month'].includes(interval)) throw new Error('interval 必须为 day、week 或 month');
  const from = url.searchParams.get('from') ?? HISTORY_START;
  const to = url.searchParams.get('to') ?? chinaToday();
  if (!validDate(from) || !validDate(to)) throw new Error('日期必须为有效的 YYYY-MM-DD');
  if (from < HISTORY_START) throw new Error('开始日期不可早于 2020-01-01');
  if (to > chinaToday()) throw new Error('结束日期不可晚于北京时间今天');
  if (from > to) throw new Error('开始日期不可晚于结束日期');
  const releaseDate = record.releaseDate ?? HISTORY_START;
  const effectiveFrom = from > releaseDate ? from : releaseDate;
  const daily = record.daily.filter(([date]) => date >= effectiveFrom && date <= to).map(([date, price, count, source]) => ({
    date, price, count, source: snapshot.sourceNames[source],
  }));
  const points: PricePoint[] = [];
  for (const item of daily) {
    const date = periodStart(item.date, interval as Interval);
    const previous = points.at(-1);
    if (previous?.date === date) {
      previous.high = Math.max(previous.high, item.price);
      previous.low = Math.min(previous.low, item.price);
      previous.close = item.price;
      previous.count += item.count;
    } else points.push({ date, open: item.price, high: item.price, low: item.price, close: item.price, count: item.count });
  }
  const expectedDays = effectiveFrom > to ? 0 : Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${effectiveFrom}T00:00:00Z`)) / DAY_MS) + 1;
  return {
    points, daily,
    coverage: {
      expectedDays, observedDays: daily.length, missingDays: expectedDays - daily.length,
      earliestDate: daily[0]?.date ?? null, latestDate: daily.at(-1)?.date ?? null,
    },
    lowPrice: record.lowPrice, lowDate: record.lowDate,
  };
}

function templateCsv() {
  return '\uFEFFproduct_id,category,brand,name,spec,release_date,date,price,source,url\r\n' +
    'my-ddr4-3200-16,memory,示例品牌（请替换）,示例型号（请替换）,16GB · DDR4 · 3200MHz,2019-01-01,2020-01-01,,请填写可追溯来源,\r\n';
}
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function exportCsv(url: URL) {
  const mode = parseMode(url);
  const productId = url.searchParams.get('productId');
  if (productId) requireProduct(productId, mode);
  const header = 'product_id,category,brand,name,spec,release_date,date,price,source,url,data_mode,observation_count,price_basis,verification_status\r\n';
  if (mode === 'real') return '\uFEFF' + header;
  const lines: string[] = [];
  for (const product of snapshot.dashboard.products) {
    if (productId && product.id !== productId) continue;
    if (mode === 'catalog') {
      lines.push([
        product.id, product.category, product.brand, product.name, product.spec, product.releaseDate,
        '', '', '', '', 'catalog', 0, '', 'unverified',
      ].map(csvCell).join(','));
      continue;
    }
    for (const [date, price, count, source] of snapshot.histories[product.id].daily) {
      lines.push([
        product.id, product.category, product.brand, product.name, product.spec, product.releaseDate,
        date, price.toFixed(2), snapshot.sourceNames[source], '', 'demo', count, 'daily_minimum', 'synthetic',
      ].map(csvCell).join(','));
    }
  }
  return '\uFEFF' + header + lines.join('\r\n') + '\r\n';
}

/** Read-only API adapter for a single self-contained HTML file. No HTTP requests. */
export async function standaloneApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (options.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
  const parsed = parseUrl(url);
  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') throw new Error('独立预览文件不支持写入云端数据库，请使用完整版导入。');
  let payload: unknown;
  if (parsed.pathname === '/api/health') payload = {ok: true, standalone: true, today: chinaToday(), snapshotDate: snapshot.date, timezone: 'Asia/Shanghai'};
  else if (parsed.pathname === '/api/dashboard') {
    const mode = parseMode(parsed);
    if (mode === 'catalog') payload = {
      mode: 'catalog', sources: [],
      products: snapshot.dashboard.products.map(product => ({
        id: product.id, category: product.category, brand: product.brand,
        name: product.name, spec: product.spec, releaseDate: product.releaseDate, profile: product.profile,
        currentPrice: null, previousPrice: null, changePercent: null, lowPrice: null,
        lowDate: null, source: null, updatedAt: null, observationCount: 0,
      })),
      summary: { ...emptySummary, productCount: snapshot.dashboard.products.length },
    };
    else payload = mode === 'demo' ? snapshot.dashboard : {mode: 'real', products: [], sources: [], summary: emptySummary};
  } else if (parsed.pathname === '/api/status') payload = snapshot.status;
  else {
    const productPath = /^\/api\/products\/([^/]+)\/(history|offers)$/.exec(parsed.pathname);
    if (!productPath) throw new Error('独立预览中没有这个接口。');
    const id = decodeURIComponent(productPath[1]);
    const mode = parseMode(parsed);
    requireProduct(id, mode);
    payload = productPath[2] === 'history' ? historyFor(id, mode, parsed) : mode === 'catalog' ? { offers: [] } : snapshot.offers[id];
  }
  return structuredClone(payload) as T;
}

/** Set the anchor download name; cached Blob URLs remain valid for this page's lifetime. */
export function standaloneDownload(url: string): string {
  const parsed = parseUrl(url);
  const key = parsed.pathname === '/api/export'
    ? `${parsed.pathname}:${parseMode(parsed)}:${parsed.searchParams.get('productId') ?? ''}`
    : parsed.pathname;
  const cached = downloadCache.get(key);
  if (cached) return cached;
  let csv: string;
  if (parsed.pathname === '/api/import/template') csv = templateCsv();
  else if (parsed.pathname === '/api/export') csv = exportCsv(parsed);
  else throw new Error('独立预览中没有这个下载文件。');
  const blobUrl = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  downloadCache.set(key, blobUrl);
  return blobUrl;
}
