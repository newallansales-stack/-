import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, seedDemo } from '../server/database.mjs';
import { chinaToday, HISTORY_START } from '../server/dates.mjs';
import { getDashboard, getHistory, getOffers } from '../server/prices.mjs';
import { DEMO_PRODUCTS } from '../server/catalog.mjs';

/** Public builds contain specification metadata only: no generated or private prices. */
export function createCatalogSnapshot({ now = new Date() } = {}) {
  const date = chinaToday(now);
  const emptySummary = {
    productCount: 0, observationCount: 0, recordedDays: 0,
    earliestDate: null, latestDate: null, sourceCount: 0,
  };
  const products = DEMO_PRODUCTS.filter(product => product.releaseDate <= date).map(product => ({
    id: product.id, category: product.category, brand: product.brand,
    name: product.name, spec: product.spec, releaseDate: product.releaseDate,
    profile: product.profile,
    currentPrice: null, previousPrice: null, changePercent: null,
    lowPrice: null, lowDate: null, source: null, updatedAt: null,
    observationCount: 0,
  }));
  return {
    version: 1, generatedAt: now.toISOString(), date, mode: 'catalog',
    description: '公开规格目录：所有价格均待核验，未发布任何模拟价格或未经核验的历史报价。',
    dashboard: {
      mode: 'catalog', products, sources: [],
      summary: { ...emptySummary, productCount: products.length },
    },
    sourceNames: [], histories: {}, offers: {},
    status: {
      standalone: true, generatedAt: now.toISOString(), today: date,
      collector: {
        configured: false, running: false, schedule: '公开目录不运行采集服务',
        lastRunAt: null, lastStatus: null, lastError: null,
        lastSuccessAt: null, nextRunAt: null,
      },
      real: { ...emptySummary }, demo: { ...emptySummary },
      historyStart: HISTORY_START, timezone: 'Asia/Shanghai',
    },
  };
}

/**
 * Build a public, read-only DEMONSTRATION snapshot. This function deliberately
 * never queries real-mode records, collector metadata or environment values.
 */
export function createSnapshot({ db: suppliedDb, dbPath, now = new Date() } = {}) {
  // The public build uses a fresh in-memory fixture DB, never the user's live database.
  const db = suppliedDb ?? openDatabase(dbPath ?? ':memory:');
  const date = chinaToday(now);
  try {
    seedDemo(db, date);
    const dashboard = getDashboard(db, 'demo');
    const sourceNames = dashboard.sources.map(source => source.name);
    const sources = new Map(sourceNames.map((name, index) => [name, index]));
    const histories = {};
    const offers = {};
    for (const product of dashboard.products) {
      const history = getHistory(db, product.id, 'demo', { from: HISTORY_START, to: date, interval: 'day' }, date);
      histories[product.id] = {
        releaseDate: product.releaseDate,
        lowPrice: history.lowPrice,
        lowDate: history.lowDate,
        // One compact tuple per observed date: date, daily minimum, vendor quote count, source index.
        daily: history.daily.map(item => [item.date, item.price, item.count, sources.get(item.source)]),
      };
      offers[product.id] = getOffers(db, product.id, 'demo');
    }
    return {
      version: 1,
      generatedAt: now.toISOString(),
      date,
      mode: 'demo',
      description: '只读演示快照：价格为合成示例，并非真实历史行情；导出文件为每日已收录最低价。',
      dashboard,
      sourceNames,
      histories,
      offers,
      status: {
        standalone: true,
        generatedAt: now.toISOString(),
        today: date,
        collector: {
          configured: false,
          running: false,
          schedule: '独立文件不运行采集服务',
          lastRunAt: null,
          lastStatus: null,
          lastError: null,
          lastSuccessAt: null,
          nextRunAt: null,
        },
        real: {
          productCount: 0, observationCount: 0, recordedDays: 0,
          earliestDate: null, latestDate: null, sourceCount: 0,
        },
        demo: dashboard.summary,
        historyStart: HISTORY_START,
        timezone: 'Asia/Shanghai',
      },
    };
  } finally {
    if (!suppliedDb) db.close();
  }
}

export function writeSnapshot(output = 'src/standalone/snapshot.json', options = {}) {
  const snapshot = createCatalogSnapshot(options);
  const path = resolve(output);
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  const content = JSON.stringify(snapshot) + '\n';
  writeFileSync(temporaryPath, content, 'utf8');
  renameSync(temporaryPath, path);
  return { path, bytes: Buffer.byteLength(content), date: snapshot.date, productCount: snapshot.dashboard.products.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output')) {
    console.error('用法：node scripts/export-snapshot.mjs [--output path/to/snapshot.json]');
    process.exitCode = 1;
  } else {
    try { console.log(`[snapshot] ${JSON.stringify(writeSnapshot(args[1]))}`); }
    catch (error) { console.error(`[snapshot] 导出规格目录失败：${error.message}`); process.exitCode = 1; }
  }
}
