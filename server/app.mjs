import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase, seedDemo, getMetadata } from './database.mjs';
import { chinaToday, HISTORY_START, nextChinaRun } from './dates.mjs';
import { exportCsv, getDashboard, getHistory, getOffers, getSummary, importCsv, InputError, parseMode, templateCsv } from './prices.mjs';

function collectorStatus(db, now) {
  const pid = Number(getMetadata(db, 'collector_pid'));
  let running = false;
  if (pid) {
    try { process.kill(pid, 0); running = true; } catch { /* Process exited or is not accessible. */ }
  }
  return {
    configured: Boolean(process.env.PRICE_FEED_URL),
    running,
    schedule: 'Asia/Shanghai 每日 09:00',
    nextRunAt: running ? nextChinaRun(now).toISOString() : null,
    lastRunAt: getMetadata(db, 'collector_last_run'),
    lastStatus: getMetadata(db, 'collector_last_status'),
    lastError: getMetadata(db, 'collector_last_error'),
    lastSuccessAt: getMetadata(db, 'collector_last_success'),
  };
}

export function createApp({ dbPath, db: suppliedDb, seed = true, now = () => new Date(), distPath = resolve('dist') } = {}) {
  const db = suppliedDb ?? openDatabase(dbPath);
  if (seed) seedDemo(db, chinaToday(now()));
  const app = express();
  app.disable('x-powered-by');
  app.locals.db = db;
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '20mb' }));
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, timezone: 'Asia/Shanghai', today: chinaToday(now()) });
  });
  app.get('/api/dashboard', (req, res) => res.json(getDashboard(db, parseMode(req.query.mode))));
  app.get('/api/products/:id/history', (req, res) => res.json(getHistory(db, req.params.id, parseMode(req.query.mode), req.query, chinaToday(now()))));
  app.get('/api/products/:id/offers', (req, res) => res.json(getOffers(db, req.params.id, parseMode(req.query.mode))));
  app.get('/api/status', (_req, res) => res.json({
    collector: collectorStatus(db, now()), real: getSummary(db, 'real'), demo: getSummary(db, 'demo'),
    historyStart: HISTORY_START, timezone: 'Asia/Shanghai', today: chinaToday(now()),
  }));
  app.get('/api/export', (req, res) => {
    const mode = parseMode(req.query.mode);
    const productId = req.query.productId;
    if (productId !== undefined && typeof productId !== 'string') throw new InputError('productId 格式错误');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hardware-prices-${mode}-${chinaToday(now())}.csv"`);
    res.send(exportCsv(db, mode, productId));
  });
  app.get('/api/import/template', (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hardware-prices-import-template.csv"');
    res.send(templateCsv());
  });
  app.post('/api/import', (req, res) => {
    // Browser imports are same-origin; this is a local, single-user application, not a public write API.
    const origin = req.get('origin');
    if (origin) {
      let originHost;
      try { originHost = new URL(origin).host; } catch { throw new InputError('请求来源无效', 403); }
      if (originHost !== req.get('host')) throw new InputError('仅允许从本站导入数据', 403);
    }
    if (!req.is('application/json')) throw new InputError('请使用 application/json 提交 CSV 内容', 415);
    res.json(importCsv(db, req.body?.csv, { today: chinaToday(now()) }));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API 不存在' }));
  if (existsSync(resolve(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.sendFile(resolve(distPath, 'index.html'));
    });
  }
  app.use((_req, res) => res.status(404).json({ error: '资源不存在' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: '文件过大：单次导入上限为 20MB' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: '请求 JSON 格式错误' });
    if (error instanceof InputError) return res.status(error.status).json({ error: error.message });
    console.error('[api] Unexpected error:', error.message);
    res.status(500).json({ error: '服务器暂时无法处理请求，请查看服务日志' });
  });
  return app;
}
