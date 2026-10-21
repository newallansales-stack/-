import { getMetadata, setMetadata } from './database.mjs';
import { chinaToday, nextChinaRun } from './dates.mjs';
import { importRecords, InputError } from './prices.mjs';

const MAX_FEED_BYTES = 20 * 1024 * 1024;

export function validateFeedUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new InputError('请在环境设置中配置有效的 PRICE_FEED_URL（HTTPS JSON 数据源）'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new InputError('PRICE_FEED_URL 必须使用 HTTPS，且不可在 URL 中包含用户名或密码');
  return url;
}

async function readLimited(response) {
  if (Number(response.headers.get('content-length')) > MAX_FEED_BYTES) throw new InputError('采集数据超过 20MB，请在上游拆分批次');
  const chunks = [];
  let length = 0;
  if (!response.body) throw new InputError('数据源返回了空响应');
  for await (const chunk of response.body) {
    length += chunk.byteLength;
    if (length > MAX_FEED_BYTES) throw new InputError('采集数据超过 20MB，请在上游拆分批次');
    chunks.push(chunk);
  }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new InputError('数据源必须返回有效的 JSON'); }
  if (!payload || !Array.isArray(payload.records)) throw new InputError('数据源 JSON 须包含 records 数组');
  return payload.records;
}

export async function collectOnce(db, {
  url = process.env.PRICE_FEED_URL,
  token = process.env.PRICE_FEED_TOKEN,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  setMetadata(db, 'collector_last_run', now.toISOString());
  try {
    const endpoint = validateFeedUrl(url);
    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetchImpl(endpoint, {
      headers, redirect: 'error', signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new InputError(`价格数据源返回 HTTP ${response.status}，请检查授权和数据源状态`);
    const records = await readLimited(response);
    const result = importRecords(db, records, { today: chinaToday(now) });
    setMetadata(db, 'collector_last_status', 'success');
    setMetadata(db, 'collector_last_success', now.toISOString());
    setMetadata(db, 'collector_last_success_day', chinaToday(now));
    setMetadata(db, 'collector_last_error', '');
    return result;
  } catch (error) {
    // Do not persist fetch errors containing endpoint query strings or credentials.
    const message = error instanceof InputError ? error.message : '无法读取价格数据源：请检查网络、TLS 和访问授权';
    setMetadata(db, 'collector_last_status', 'error');
    setMetadata(db, 'collector_last_error', message);
    throw new InputError(message);
  }
}

export function wasCollectedToday(db, now = new Date()) {
  return getMetadata(db, 'collector_last_success_day') === chinaToday(now);
}

export function nextCollectionDelay(now = new Date()) {
  return nextChinaRun(now).getTime() - now.getTime();
}
