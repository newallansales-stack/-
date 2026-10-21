import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { parse } from 'csv-parse/sync';
import { createCatalogSnapshot, writeSnapshot } from '../scripts/export-snapshot.mjs';
import { DEMO_PRODUCTS } from '../server/catalog.mjs';
import { openDatabase, setMetadata } from '../server/database.mjs';
import { importRecords } from '../server/prices.mjs';

const now = new Date('2026-10-21T04:00:00Z');
const priceFields = ['currentPrice', 'previousPrice', 'changePercent', 'lowPrice', 'lowDate', 'source', 'updatedAt'];

async function loadRuntime(snapshot) {
  const source = readFileSync(new URL('../src/standalone/runtime.ts', import.meta.url), 'utf8')
    .replace("import snapshotJson from './snapshot.json';", `const snapshotJson = ${JSON.stringify(snapshot)};`);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

test('public catalog includes every released model but no synthetic prices, quotes or histories', () => {
  const snapshot = createCatalogSnapshot({now});
  assert.equal(snapshot.mode, 'catalog');
  assert.equal(snapshot.dashboard.mode, 'catalog');
  assert.equal(snapshot.date, '2026-10-21');
  assert.equal(snapshot.dashboard.products.length, 66);
  assert.equal(snapshot.dashboard.products.length, DEMO_PRODUCTS.filter(product => product.releaseDate <= snapshot.date).length);
  for (const product of snapshot.dashboard.products) {
    assert.ok(product.profile);
    for (const field of priceFields) assert.equal(product[field], null, `${product.id}.${field}`);
    assert.equal(product.observationCount, 0);
    assert.ok(!Object.hasOwn(product, 'target'));
    assert.ok(!Object.hasOwn(product, 'launch'));
  }
  assert.deepEqual(snapshot.histories, {});
  assert.deepEqual(snapshot.offers, {});
  assert.deepEqual(snapshot.sourceNames, []);
  assert.deepEqual(snapshot.dashboard.sources, []);
  assert.equal(snapshot.dashboard.summary.observationCount, 0);
  assert.equal(snapshot.dashboard.summary.recordedDays, 0);
  assert.equal(snapshot.dashboard.summary.sourceCount, 0);
  assert.equal(snapshot.dashboard.summary.earliestDate, null);
  assert.equal(snapshot.dashboard.summary.latestDate, null);
  assert.equal(snapshot.status.demo.observationCount, 0);
  assert.equal(snapshot.status.real.observationCount, 0);
});

test('default public writer ignores a supplied private database, collector metadata and environment values', () => {
  const db = openDatabase(':memory:');
  const dir = mkdtempSync(join(tmpdir(), 'catalog-snapshot-'));
  const previous = process.env.PRICE_FEED_TOKEN;
  process.env.PRICE_FEED_TOKEN = 'CATALOG_TEST_PRIVATE_TOKEN';
  try {
    importRecords(db, [{
      product_id: 'catalog-test-private-id', category: 'memory', brand: 'CATALOG_TEST_PRIVATE_BRAND',
      name: 'CATALOG_TEST_PRIVATE_NAME', spec: 'PRIVATE_SPEC', release_date: '2020-01-01',
      date: '2020-01-02', price: '123.45', source: 'CATALOG_TEST_PRIVATE_SOURCE',
      url: 'https://private.example.com/quote',
    }], {today: '2026-10-21'});
    setMetadata(db, 'collector_last_error', 'CATALOG_TEST_PRIVATE_ERROR');
    const output = join(dir, 'snapshot.json');
    writeSnapshot(output, {db, now});
    const text = readFileSync(output, 'utf8');
    assert.ok(!text.includes('CATALOG_TEST_PRIVATE'));
    assert.ok(!text.includes('catalog-test-private-id'));
    assert.ok(!text.includes('private.example.com'));
    assert.equal(JSON.parse(text).mode, 'catalog');
    assert.equal(db.prepare("SELECT COUNT(*) n FROM observations WHERE mode='demo'").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM observations WHERE mode='real'").get().n, 1);
  } finally {
    if (previous === undefined) delete process.env.PRICE_FEED_TOKEN;
    else process.env.PRICE_FEED_TOKEN = previous;
    db.close();
    rmSync(dir, {recursive: true, force: true});
  }
});

test('public catalog runtime returns null prices and empty release-bounded history and rejects demo and imports', async () => {
  const snapshot = createCatalogSnapshot({now});
  const runtime = await loadRuntime(snapshot);
  const dashboard = await runtime.standaloneApi('/api/dashboard');
  assert.equal(dashboard.mode, 'catalog');
  assert.equal(dashboard.products.length, 66);
  assert.ok(dashboard.products.every(product => priceFields.every(field => product[field] === null)));
  const product = dashboard.products.find(product => product.releaseDate > '2020-01-01');
  const history = await runtime.standaloneApi(`/api/products/${product.id}/history?mode=catalog&from=2020-01-01&to=2026-10-21&interval=week`);
  assert.deepEqual(history.points, []);
  assert.deepEqual(history.daily, []);
  assert.equal(history.lowPrice, null);
  assert.equal(history.lowDate, null);
  assert.equal(history.coverage.observedDays, 0);
  const expectedDays = Math.round((Date.parse('2026-10-21T00:00:00Z') - Date.parse(`${product.releaseDate}T00:00:00Z`)) / 86_400_000) + 1;
  assert.equal(history.coverage.expectedDays, expectedDays);
  assert.equal(history.coverage.missingDays, expectedDays);
  assert.deepEqual(await runtime.standaloneApi(`/api/products/${product.id}/offers?mode=catalog`), {offers: []});
  assert.equal((await runtime.standaloneApi('/api/dashboard?mode=real')).products.length, 0);
  await assert.rejects(runtime.standaloneApi('/api/dashboard?mode=demo'), /公开版已撤下模拟价格/);
  await assert.rejects(runtime.standaloneApi(`/api/products/${product.id}/history?mode=demo`), /公开版已撤下模拟价格/);
  await assert.rejects(runtime.standaloneApi('/api/import', {method: 'POST'}), /不支持写入/);
});

test('catalog export contains only specifications with blank date and price and explicit unverified status', async () => {
  const runtime = await loadRuntime(createCatalogSnapshot({now}));
  const link = runtime.standaloneDownload('/api/export?mode=catalog');
  try {
    assert.equal(runtime.standaloneDownload('/api/export'), link);
    const csv = await (await fetch(link)).text();
    const rows = parse(csv, {columns: true, bom: true, skip_empty_lines: true});
    assert.equal(rows.length, 66);
    for (const row of rows) {
      assert.equal(row.date, '');
      assert.equal(row.price, '');
      assert.equal(row.source, '');
      assert.equal(row.data_mode, 'catalog');
      assert.equal(row.verification_status, 'unverified');
      assert.equal(row.observation_count, '0');
    }
    const db = openDatabase(':memory:');
    try { assert.throws(() => importRecords(db, rows, {today: '2026-10-21'}), /不可导入/); }
    finally { db.close(); }
    assert.throws(() => runtime.standaloneDownload('/api/export?mode=demo'), /公开版已撤下模拟价格/);
  } finally {URL.revokeObjectURL(link);}
});
