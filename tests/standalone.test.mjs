import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSnapshot, writeSnapshot } from '../scripts/export-snapshot.mjs';
import { openDatabase, setMetadata } from '../server/database.mjs';
import { getHistory, importRecords } from '../server/prices.mjs';
import ts from 'typescript';

async function loadStandaloneRuntime(snapshot) {
  const source = readFileSync(new URL('../src/standalone/runtime.ts', import.meta.url), 'utf8')
    .replace("import snapshotJson from './snapshot.json';", `const snapshotJson = ${JSON.stringify(snapshot)};`);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

test('standalone snapshot contains only demo data and no real records or collector secrets', () => {
  const db = openDatabase(':memory:');
  const now = new Date('2020-01-07T12:00:00+08:00');
  try {
    importRecords(db, [{
      product_id: 'private-real-id', category: 'memory', brand: 'PRIVATE_REAL_BRAND', name: 'PRIVATE_REAL_NAME',
      spec: 'PRIVATE_REAL_SPEC', release_date: '2019-01-01', date: '2020-01-01', price: '99.99',
      source: 'PRIVATE_REAL_SOURCE', url: 'https://private-real.example.com/item',
    }], {today: '2020-01-07'});
    setMetadata(db, 'collector_last_error', 'SECRET_COLLECTOR_METADATA');
    const snapshot = createSnapshot({db, now});
    const json = JSON.stringify(snapshot);
    assert.equal(snapshot.mode, 'demo');
    assert.equal(snapshot.date, '2020-01-07');
    assert.ok(snapshot.dashboard.products.length > 0);
    assert.equal(snapshot.status.real.observationCount, 0);
    assert.equal(snapshot.status.collector.configured, false);
    assert.equal(snapshot.status.collector.running, false);
    assert.ok(!json.includes('PRIVATE_REAL'));
    assert.ok(!json.includes('private-real'));
    assert.ok(!json.includes('SECRET_COLLECTOR_METADATA'));
    assert.equal(db.prepare("SELECT COUNT(*) n FROM observations WHERE mode='real'").get().n, 1);
  } finally {db.close();}
});

test('compact snapshot preserves every observed day, source, quote count and all-time minimum', () => {
  const db = openDatabase(':memory:');
  const now = new Date('2020-01-07T12:00:00+08:00');
  try {
    const snapshot = createSnapshot({db, now});
    for (const product of snapshot.dashboard.products) {
      const full = getHistory(db, product.id, 'demo', {from: '2020-01-01', to: '2020-01-07', interval: 'day'}, '2020-01-07');
      const compact = snapshot.histories[product.id];
      assert.deepEqual(compact.daily.map(([date, price, count, source]) => ({date, price, count, source: snapshot.sourceNames[source]})), full.daily);
      assert.equal(compact.lowPrice, full.lowPrice);
      assert.equal(compact.lowDate, full.lowDate);
      assert.ok(compact.daily.every(([date, _price, count]) => date >= product.releaseDate && count === 3));
    }
  } finally {db.close();}
});

test('snapshot exporter creates a valid JSON artifact at the requested output path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hardware-snapshot-'));
  const db = openDatabase(':memory:');
  try {
    const output = join(dir, 'nested', 'snapshot.json');
    const result = writeSnapshot(output, {db, now: new Date('2020-01-03T12:00:00+08:00')});
    assert.equal(result.path, output);
    assert.equal(result.date, '2020-01-03');
    const content = readFileSync(output, 'utf8');
    assert.equal(result.bytes, Buffer.byteLength(content));
    assert.equal(JSON.parse(content).dashboard.products.length, result.productCount);
  } finally {db.close(); rmSync(dir, {recursive: true, force: true});}
});

test('standalone runtime matches server OHLC and gaps, stays read-only and caches CSV downloads', async () => {
  const db = openDatabase(':memory:');
  const now = new Date('2020-01-07T12:00:00+08:00');
  try {
    createSnapshot({db, now});
    const id = 'corsair-ddr4-3200-32';
    // A fully missing day must remain a gap even in a public static build.
    db.prepare("DELETE FROM observations WHERE product_id=? AND mode='demo' AND date='2020-01-03'").run(id);
    const snapshot = createSnapshot({db, now});
    const runtime = await loadStandaloneRuntime(snapshot);
    const path = `/api/products/${id}/history?mode=demo&from=2020-01-01&to=2020-01-07&interval=week`;
    const result = await runtime.standaloneApi(path);
    const expected = getHistory(db, id, 'demo', {from:'2020-01-01',to:'2020-01-07',interval:'week'}, '2020-01-07');
    assert.deepEqual(result.points, expected.points);
    assert.deepEqual(result.daily, expected.daily);
    assert.deepEqual(result.coverage, expected.coverage);
    assert.equal(result.coverage.missingDays, 1);
    assert.equal(result.points.reduce((sum, point) => sum + point.count, 0), 18);
    assert.equal(result.lowPrice, expected.lowPrice);
    assert.equal((await runtime.standaloneApi('/api/dashboard?mode=real')).products.length, 0);
    assert.equal((await runtime.standaloneApi('/api/status')).collector.running, false);
    await assert.rejects(runtime.standaloneApi('/api/import', {method:'POST'}), /不支持写入/);
    await assert.rejects(runtime.standaloneApi('/api/dashboard?mode=demo', {signal:AbortSignal.abort()}), {name:'AbortError'});
    const download = runtime.standaloneDownload(`/api/export?mode=demo&productId=${id}`);
    assert.equal(runtime.standaloneDownload(`/api/export?productId=${id}&mode=demo`), download);
    const csv = await (await fetch(download)).text();
    assert.match(csv, /data_mode,observation_count,price_basis/);
    assert.match(csv, /demo,3,daily_minimum/);
    assert.ok(!csv.includes('2020-01-03'));
    const template = await (await fetch(runtime.standaloneDownload('/api/import/template'))).text();
    assert.match(template, /2020-01-01,,请填写可追溯来源/);
    URL.revokeObjectURL(download);
  } finally {db.close();}
});
