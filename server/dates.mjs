export const HISTORY_START = '2020-01-01';
export const DAY_MS = 86_400_000;

export function chinaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(value, days) {
  return new Date(new Date(`${value}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  if (from > to) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

export function periodStart(date, interval) {
  if (interval === 'month') return `${date.slice(0, 7)}-01`;
  if (interval === 'week') {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return addDays(date, -((weekday + 6) % 7));
  }
  return date;
}

export function nextChinaRun(now = new Date(), hour = 9) {
  const today = chinaToday(now);
  const target = new Date(`${today}T${String(hour).padStart(2, '0')}:00:00+08:00`);
  return target > now ? target : new Date(target.getTime() + DAY_MS);
}
