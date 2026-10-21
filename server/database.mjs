import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEMO_CATALOG_VERSION, DEMO_PRODUCTS, DEMO_SOURCES } from './catalog.mjs';
import { HISTORY_START, addDays, chinaToday, daysBetween } from './dates.mjs';

export const DEFAULT_DB_PATH = resolve(process.env.PRICE_DB_PATH || 'data/prices.sqlite');

export function openDatabase(path = DEFAULT_DB_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('demo', 'real')),
      category TEXT NOT NULL CHECK(category IN ('memory', 'gpu', 'cpu', 'storage')),
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      spec TEXT NOT NULL,
      release_date TEXT NOT NULL,
      PRIMARY KEY(id, mode)
    );
    CREATE TABLE IF NOT EXISTS observations (
      product_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('demo', 'real')),
      date TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK(price_cents > 0),
      source TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(product_id, mode, date, source),
      FOREIGN KEY(product_id, mode) REFERENCES products(id, mode)
    );
    CREATE INDEX IF NOT EXISTS observations_mode_date ON observations(mode, date);
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

function hash(text) {
  let n = 2166136261;
  for (const char of text) { n ^= char.charCodeAt(0); n = Math.imul(n, 16777619); }
  return (n >>> 0) / 4294967295;
}

/** Pure fixture generation: never used to fill gaps in imported data. */
export function demoPrice(product, date, sourceIndex) {
  const age = daysBetween(product.releaseDate, date) - 1;
  const remaining = Math.exp(-age / 440);
  let value = product.target + (product.launch - product.target) * remaining;
  const dayIndex = daysBetween('2017-01-01', date);
  const cycle = Math.sin(dayIndex / 93 + hash(product.id) * 10) * 0.085;
  const noise = (hash(`${product.id}:${date}:${sourceIndex}`) - 0.5) * 0.036;
  const monthDay = date.slice(5);
  const sale = (monthDay >= '06-10' && monthDay <= '06-18') || (monthDay >= '11-01' && monthDay <= '11-11') ? -0.13 : 0;
  const shortage = product.category === 'gpu' && date >= '2021-01-01' && date < '2022-06-01' ? 0.7 + 0.25 * Math.sin(dayIndex / 80) : 0;
  value *= 1 + cycle + noise + sale + shortage + sourceIndex * 0.023;
  return Math.max(100, Math.round(value) * 100);
}

/** Idempotently extends only the demo mode through the specified current day. */
export function seedDemo(db, today = chinaToday()) {
  const previous = db.prepare("SELECT value FROM metadata WHERE key = 'demo_seeded_through'").get()?.value;
  // Inspect each product even when this DB was already seeded through today:
  // a newer catalogue may introduce models that the global date marker cannot detect.
  const insertProduct = db.prepare(`INSERT INTO products
    (id, mode, category, brand, name, spec, release_date) VALUES (?, 'demo', ?, ?, ?, ?, ?)
    ON CONFLICT(id,mode) DO UPDATE SET category=excluded.category,brand=excluded.brand,
      name=excluded.name,spec=excluded.spec,release_date=excluded.release_date
    WHERE products.category!=excluded.category OR products.brand!=excluded.brand OR
      products.name!=excluded.name OR products.spec!=excluded.spec OR products.release_date!=excluded.release_date`);
  const latest = db.prepare("SELECT MAX(date) date FROM observations WHERE product_id=? AND mode='demo'");
  const trimBeforeRelease = db.prepare("DELETE FROM observations WHERE product_id=? AND mode='demo' AND date<?");
  const insert = db.prepare(`INSERT OR IGNORE INTO observations
    (product_id, mode, date, price_cents, source, url) VALUES (?, 'demo', ?, ?, ?, '')`);
  let count = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const product of DEMO_PRODUCTS) {
      insertProduct.run(product.id, product.category, product.brand, product.name, product.spec, product.releaseDate);
      // A refined fixture launch date must not leave synthetic quotes before launch.
      // Only the demo namespace is affected; imported records are never touched.
      trimBeforeRelease.run(product.id, product.releaseDate);
      const lastProductDate = latest.get(product.id)?.date;
      const from = [HISTORY_START, product.releaseDate, lastProductDate ? addDays(lastProductDate, 1) : HISTORY_START].sort().at(-1);
      for (let date = from; date <= today; date = addDays(date, 1)) {
        DEMO_SOURCES.forEach((source, index) => {
          count += Number(insert.run(product.id, date, demoPrice(product, date, index), source).changes);
        });
      }
    }
    db.prepare("INSERT INTO metadata (key,value) VALUES ('demo_seeded_through',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(previous && previous > today ? previous : today);
    db.prepare("INSERT INTO metadata (key,value) VALUES ('demo_catalog_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(DEMO_CATALOG_VERSION);
    db.exec('COMMIT');
    return count;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function getMetadata(db, key) { return db.prepare('SELECT value FROM metadata WHERE key = ?').get(key)?.value ?? null; }
export function setMetadata(db, key, value) {
  db.prepare('INSERT INTO metadata(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
}
