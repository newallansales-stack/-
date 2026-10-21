import { parse } from 'csv-parse/sync';
import { addDays, chinaToday, daysBetween, HISTORY_START, periodStart, validDate } from './dates.mjs';

export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const CSV_FIELDS = ['product_id', 'category', 'brand', 'name', 'spec', 'release_date', 'date', 'price', 'source', 'url'];
const CATEGORIES = new Set(['memory', 'gpu', 'cpu', 'storage']);
const MAX_ROWS = 100_000;
const PRODUCT_FIELDS = ['category', 'brand', 'name', 'spec', 'release_date'];

export function parseMode(mode) {
  if (mode === undefined || mode === 'demo') return 'demo';
  if (mode === 'real') return 'real';
  throw new InputError('mode 必须为 demo 或 real');
}

export function getSummary(db, mode) {
  const summary = db.prepare(`SELECT COUNT(*) observationCount, COUNT(DISTINCT product_id) productCount,
    COUNT(DISTINCT date) recordedDays, MIN(date) earliestDate, MAX(date) latestDate,
    COUNT(DISTINCT source) sourceCount FROM observations WHERE mode = ?`).get(mode);
  return { ...summary };
}

export function getDashboard(db, mode) {
  const rows = db.prepare(`WITH latest AS (
    SELECT product_id, MAX(date) date FROM observations WHERE mode = ? GROUP BY product_id
  ), aggregates AS (
    SELECT product_id, MIN(price_cents) low_price, COUNT(*) observation_count
    FROM observations WHERE mode = ? GROUP BY product_id
  ) SELECT p.*, l.date updated_at, a.low_price, a.observation_count,
    (SELECT MIN(o.price_cents) FROM observations o WHERE o.product_id=p.id AND o.mode=p.mode AND o.date=l.date) current_price,
    (SELECT MIN(o.date) FROM observations o WHERE o.product_id=p.id AND o.mode=p.mode AND o.price_cents=a.low_price) low_date,
    (SELECT o.source FROM observations o WHERE o.product_id=p.id AND o.mode=p.mode AND o.date=l.date ORDER BY o.price_cents,o.source LIMIT 1) source,
    (SELECT MIN(o.price_cents) FROM observations o WHERE o.product_id=p.id AND o.mode=p.mode AND o.date=date(l.date,'-1 day')) previous_price
    FROM products p JOIN latest l ON l.product_id=p.id JOIN aggregates a ON a.product_id=p.id
    WHERE p.mode = ? ORDER BY p.category, p.name`).all(mode, mode, mode);
  return {
    mode,
    products: rows.map(row => ({
      id: row.id, category: row.category, brand: row.brand, name: row.name, spec: row.spec,
      releaseDate: row.release_date, currentPrice: row.current_price / 100,
      previousPrice: row.previous_price == null ? null : row.previous_price / 100,
      changePercent: row.previous_price ? Math.round((row.current_price - row.previous_price) / row.previous_price * 10000) / 100 : null,
      lowPrice: row.low_price / 100, lowDate: row.low_date, source: row.source,
      updatedAt: row.updated_at, observationCount: row.observation_count,
    })),
    summary: getSummary(db, mode),
    sources: db.prepare(`SELECT source name, COUNT(*) observationCount, MAX(date) latestDate
      FROM observations WHERE mode = ? GROUP BY source ORDER BY source`).all(mode).map(row => ({ ...row })),
  };
}

export function getProduct(db, id, mode) {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND mode = ?').get(id, mode);
  if (!product) throw new InputError('该数据模式下没有这个型号，请先导入数据', 404);
  return product;
}

export function aggregateDaily(daily, interval) {
  const points = [];
  for (const item of daily) {
    const date = periodStart(item.date, interval);
    const count = item.count ?? 1;
    const previous = points.at(-1);
    if (previous?.date === date) {
      previous.high = Math.max(previous.high, item.price);
      previous.low = Math.min(previous.low, item.price);
      previous.close = item.price;
      previous.count += count;
    } else points.push({ date, open: item.price, high: item.price, low: item.price, close: item.price, count });
  }
  return points;
}

export function getHistory(db, id, mode, query = {}, today = chinaToday()) {
  const product = getProduct(db, id, mode);
  const interval = query.interval ?? 'week';
  if (!['day', 'week', 'month'].includes(interval)) throw new InputError('interval 必须为 day、week 或 month');
  const from = query.from ?? HISTORY_START;
  const to = query.to ?? today;
  if (!validDate(from) || !validDate(to)) throw new InputError('日期必须为有效的 YYYY-MM-DD');
  if (from < HISTORY_START) throw new InputError('开始日期不可早于 2020-01-01');
  if (to > today) throw new InputError('结束日期不可晚于北京时间今天');
  if (from > to) throw new InputError('开始日期不可晚于结束日期');
  const effectiveFrom = from > product.release_date ? from : product.release_date;
  const daily = db.prepare(`SELECT date, MIN(price_cents) price_cents, COUNT(*) observation_count,
    (SELECT x.source FROM observations x WHERE x.product_id=o.product_id AND x.mode=o.mode AND x.date=o.date ORDER BY x.price_cents,x.source LIMIT 1) source
    FROM observations o WHERE product_id=? AND mode=? AND date>=? AND date<=?
    GROUP BY date ORDER BY date`).all(id, mode, effectiveFrom, to).map(row => ({date: row.date, price: row.price_cents / 100, source: row.source, count: row.observation_count}));
  const low = db.prepare(`SELECT price_cents, date FROM observations WHERE product_id=? AND mode=?
    ORDER BY price_cents,date LIMIT 1`).get(id, mode);
  const expectedDays = daysBetween(effectiveFrom, to);
  return {
    mode, productId: id, interval, from: effectiveFrom, to,
    points: aggregateDaily(daily, interval), daily,
    coverage: { expectedDays, observedDays: daily.length, missingDays: expectedDays - daily.length,
      earliestDate: daily[0]?.date ?? null, latestDate: daily.at(-1)?.date ?? null },
    lowPrice: low ? low.price_cents / 100 : null, lowDate: low?.date ?? null,
  };
}

export function getOffers(db, id, mode) {
  getProduct(db, id, mode);
  // Only the latest recorded day is comparable: do not present stale vendor quotes as current offers.
  const offers = db.prepare(`SELECT source, price_cents, date, url FROM observations
    WHERE product_id=? AND mode=? AND date=(SELECT MAX(date) FROM observations WHERE product_id=? AND mode=?)
    ORDER BY price_cents,source`).all(id, mode, id, mode);
  return { offers: offers.map(row => ({ source: row.source, price: row.price_cents / 100, date: row.date, url: row.url || null })) };
}

function requiredText(value, field, row, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new InputError(`第 ${row} 行：${field} 必须为 1–${max} 个可见字符`);
  }
  return value.trim();
}

function normalizeRecord(record, row, today) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new InputError(`第 ${row} 行：记录格式错误`);
  if (record.data_mode != null && record.data_mode !== 'real') throw new InputError(`第 ${row} 行：演示数据不可导入为真实历史记录`);
  const item = {};
  for (const field of ['product_id', 'category', 'brand', 'name', 'spec', 'release_date', 'date', 'source']) {
    item[field] = requiredText(record[field], field, row, field === 'spec' ? 300 : 160);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(item.product_id)) throw new InputError(`第 ${row} 行：product_id 仅支持英文字母、数字、点、横线、下划线，最多 100 字符`);
  if (!CATEGORIES.has(item.category)) throw new InputError(`第 ${row} 行：category 必须是 memory、gpu、cpu 或 storage`);
  if (!validDate(item.date) || !validDate(item.release_date)) throw new InputError(`第 ${row} 行：日期必须为有效的 YYYY-MM-DD`);
  if (item.release_date > today) throw new InputError(`第 ${row} 行：上市日期不可晚于今天`);
  if (item.date < HISTORY_START || item.date > today) throw new InputError(`第 ${row} 行：价格日期须在 2020-01-01 至 ${today} 之间`);
  if (item.date < item.release_date) throw new InputError(`第 ${row} 行：价格日期不可早于型号上市日期`);
  const rawPrice = typeof record.price === 'number' ? String(record.price) : record.price?.trim();
  if (typeof rawPrice !== 'string' || !/^\d{1,7}(\.\d{1,2})?$/.test(rawPrice) || Number(rawPrice) <= 0 || Number(rawPrice) > 1_000_000) {
    throw new InputError(`第 ${row} 行：price 须为大于 0、最多两位小数且不超过 1000000 的人民币价格`);
  }
  item.price_cents = Math.round(Number(rawPrice) * 100);
  item.url = record.url == null ? '' : String(record.url).trim();
  if (item.url) {
    let parsed;
    try { parsed = new URL(item.url); } catch { throw new InputError(`第 ${row} 行：url 必须为 HTTPS 商品或证据链接`); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || item.url.length > 2000) throw new InputError(`第 ${row} 行：url 必须为不含用户名和密码的 HTTPS 链接`);
  }
  return item;
}

export function importRecords(db, records, { today = chinaToday() } = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new InputError('没有可导入的数据行');
  if (records.length > MAX_ROWS) throw new InputError(`单次最多导入 ${MAX_ROWS} 行`);
  // Validate the whole payload and metadata before modifying anything.
  const normalized = records.map((record, index) => normalizeRecord(record, index + 2, today));
  const products = new Map();
  const insertProduct = db.prepare(`INSERT OR IGNORE INTO products
    (id,mode,category,brand,name,spec,release_date) VALUES (?,'real',?,?,?,?,?)`);
  const find = db.prepare("SELECT price_cents,url FROM observations WHERE product_id=? AND mode='real' AND date=? AND source=?");
  const upsert = db.prepare(`INSERT INTO observations(product_id,mode,date,price_cents,source,url)
    VALUES (?,'real',?,?,?,?) ON CONFLICT(product_id,mode,date,source)
    DO UPDATE SET price_cents=excluded.price_cents,url=excluded.url`);
  let imported = 0, updated = 0, skipped = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    // Check metadata under the same write lock as inserts: a concurrent collector cannot change the SKU contract.
    for (const [index, item] of normalized.entries()) {
      const existing = products.get(item.product_id) ?? db.prepare("SELECT * FROM products WHERE id=? AND mode='real'").get(item.product_id);
      if (existing && PRODUCT_FIELDS.some(field => existing[field] !== item[field])) {
        throw new InputError(`第 ${index + 2} 行：同一 product_id 的品类、品牌、名称、规格和上市日期必须一致；不同规格请使用不同 ID`);
      }
      products.set(item.product_id, item);
    }
    for (const item of products.values()) insertProduct.run(item.product_id, item.category, item.brand, item.name, item.spec, item.release_date);
    for (const item of normalized) {
      const existing = find.get(item.product_id, item.date, item.source);
      if (existing?.price_cents === item.price_cents && existing.url === item.url) { skipped++; continue; }
      upsert.run(item.product_id, item.date, item.price_cents, item.source, item.url);
      if (existing) updated++; else imported++;
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { imported, updated, skipped, message: `新增 ${imported} 条，更新 ${updated} 条，跳过 ${skipped} 条重复记录` };
}

export function importCsv(db, csv, options = {}) {
  if (typeof csv !== 'string' || !csv.trim()) throw new InputError('请选择含有数据的 CSV 文件');
  let records;
  try {
    records = parse(csv, {
      bom: true, skip_empty_lines: true, trim: true, max_record_size: 20_000,
      columns: headers => {
        if (headers.length !== new Set(headers).size) throw new Error('CSV 存在重复列名');
        const missing = CSV_FIELDS.filter(field => field !== 'url' && !headers.includes(field));
        if (missing.length) throw new Error(`缺少列：${missing.join(', ')}`);
        return headers;
      },
    });
  } catch (error) { throw new InputError(`CSV 格式错误：${error.message}`); }
  return importRecords(db, records, options);
}

export function csvCell(value) {
  let text = String(value ?? '');
  // Avoid executing untrusted spreadsheet formulas when an exported CSV is opened in Excel.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportCsv(db, mode, productId) {
  if (productId) getProduct(db, productId, mode);
  const rows = db.prepare(`SELECT p.id product_id,p.category,p.brand,p.name,p.spec,p.release_date,
    o.date,o.price_cents,o.source,o.url FROM observations o JOIN products p
    ON p.id=o.product_id AND p.mode=o.mode WHERE o.mode=? ${productId ? 'AND o.product_id=?' : ''}
    ORDER BY o.date,o.product_id,o.source`).all(...(productId ? [mode, productId] : [mode]));
  // Deliberately include data_mode. Demo exports must never masquerade as genuine historical records.
  return '\uFEFF' + [...CSV_FIELDS, 'data_mode'].join(',') + '\r\n' + rows.map(row =>
    [...CSV_FIELDS.map(field => csvCell(field === 'price' ? (row.price_cents / 100).toFixed(2) : row[field])), mode].join(',')
  ).join('\r\n') + '\r\n';
}

export function templateCsv() {
  return '\uFEFF' + CSV_FIELDS.join(',') + '\r\n' + [
    'my-ddr4-3200-16', 'memory', '示例品牌（请替换）', '示例型号（请替换）', '16GB · DDR4 · 3200MHz',
    '2019-01-01', '2020-01-01', '', '请填写可追溯来源', '',
  ].map(csvCell).join(',') + '\r\n';
}
