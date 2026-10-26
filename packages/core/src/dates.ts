/** 纯日期运算（YYYY-MM-DD，按日历日，不涉及时区换算）。 */

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pa[0], pa[1] - 1, pa[2]) - Date.UTC(pb[0], pb[1] - 1, pb[2])) / 86400000);
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
export function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** D-47 / D-Day / D+3 */
export function dLabel(iso: string, eventDate: string): string {
  const n = diffDays(iso, eventDate);
  return n === 0 ? 'D-Day' : n < 0 ? `D${n}` : `D+${n}`;
}

/** 活动日某个本地时刻对应的 epoch 毫秒（tz 仅支持固定偏移，如 +08:00） */
export function localTime(iso: string, hhmm: string, offset = '+08:00'): number {
  return Date.parse(`${iso}T${hhmm}:00${offset}`);
}
