import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须为 1 至 65535 的整数');
const app = createApp();
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`[hardware-price] API ready on port ${port}; prices are demo fixtures until you import real data.`);
});
server.on('error', error => { console.error(`[hardware-price] ${error.message}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(() => { app.locals.db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 5000).unref();
});
