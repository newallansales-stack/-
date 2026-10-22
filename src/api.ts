import {historicalMarketApi, historicalMarketDownload} from './historical-market';
export const IS_STANDALONE = import.meta.env.VITE_STANDALONE === 'true';
let standalone: typeof import('./standalone/runtime') | undefined;

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (options.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
  const parsed = new URL(url, 'https://chipprice.invalid');
  if (parsed.searchParams.get('mode') === 'historical') {
    if (options.method && options.method.toUpperCase() !== 'GET') throw new Error('历史报价档案仅供读取。');
    return historicalMarketApi(parsed) as T;
  }
  if (IS_STANDALONE) {
    standalone ??= await import('./standalone/runtime');
    return standalone.standaloneApi<T>(url, options);
  }
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || `请求失败 (${response.status})`);
  return payload as T;
}

export function downloadHref(url: string) {
  const parsed = new URL(url, 'https://chipprice.invalid');
  if (parsed.searchParams.get('mode') === 'historical') return historicalMarketDownload(parsed);
  return IS_STANDALONE ? standalone?.standaloneDownload(url) ?? '#' : url;
}
