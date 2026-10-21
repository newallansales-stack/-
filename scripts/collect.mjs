import { openDatabase, setMetadata } from '../server/database.mjs';
import { collectOnce, nextCollectionDelay, validateFeedUrl, wasCollectedToday } from '../server/collector.mjs';
import { nextChinaRun } from '../server/dates.mjs';

const watch = process.argv.includes('--watch');
if (process.argv.slice(2).some(arg => !['--watch', '--once'].includes(arg))) {
  console.error('用法：node scripts/collect.mjs --once | --watch'); process.exit(1);
}
try { validateFeedUrl(process.env.PRICE_FEED_URL); } catch (error) { console.error(error.message); process.exit(1); }
const db = openDatabase();
let timer;
let stopped = false;
let collecting = false;

async function run() {
  collecting = true;
  try { console.log(`[collector] ${JSON.stringify(await collectOnce(db))}`); }
  catch (error) { console.error(`[collector] ${error.message}`); if (!watch) process.exitCode = 1; }
  finally { collecting = false; }
}

function schedule() {
  console.log(`[collector] 下一次采集：${nextChinaRun().toISOString()}（北京时间每日 09:00）`);
  timer = setTimeout(async () => {
    if (stopped) return;
    if (!wasCollectedToday(db)) await run();
    if (!stopped) schedule();
  }, nextCollectionDelay());
}

function close() {
  stopped = true;
  clearTimeout(timer);
  setMetadata(db, 'collector_pid', '');
  if (!collecting) { db.close(); process.exit(0); }
  const waiter = setInterval(() => { if (!collecting) { clearInterval(waiter); db.close(); process.exit(0); } }, 100);
}

if (watch) {
  setMetadata(db, 'collector_pid', process.pid);
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  if (!wasCollectedToday(db)) await run();
  if (!stopped) schedule();
} else {
  await run(); db.close();
}
