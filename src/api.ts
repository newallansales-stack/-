export const IS_STANDALONE = import.meta.env.VITE_STANDALONE === 'true';
let standalone: typeof import('./standalone/runtime') | undefined;

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
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
  return IS_STANDALONE ? standalone?.standaloneDownload(url) ?? '#' : url;
}
