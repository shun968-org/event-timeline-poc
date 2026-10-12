import type { TimeZoneMode } from '../view-state';

const OFFSET_MS: Record<TimeZoneMode, number> = { jst: 9 * 3_600_000, utc: 0 };
export const TIME_ZONE_LABEL: Record<TimeZoneMode, string> = { jst: 'JST', utc: 'UTC' };

/** `yyyy-MM-dd HH:mm:ss.SSS`(日本は夏時間が無いので、固定の時差で求める) */
export function formatDateTime(ms: number, tz: TimeZoneMode): string {
  return new Date(ms + OFFSET_MS[tz]).toISOString().slice(0, 23).replace('T', ' ');
}

/** 一覧用の短い形 `MM-dd HH:mm:ss.SSS` */
export function formatShort(ms: number, tz: TimeZoneMode): string {
  return formatDateTime(ms, tz).slice(5);
}

/** 軸の目盛り用 `HH:mm`。日付が変わる目盛りは `MM-dd HH:mm` */
export function formatTick(ms: number, tz: TimeZoneMode): string {
  const text = formatDateTime(ms, tz);
  const time = text.slice(11, 16);
  return time === '00:00' ? `${text.slice(5, 10)} ${time}` : time;
}

/** 目盛りの位置(表示するタイムゾーンで stepMs ごとに揃える) */
export function ticks(from: number, to: number, stepMs: number, tz: TimeZoneMode): number[] {
  const offset = OFFSET_MS[tz];
  const result: number[] = [];
  for (let t = Math.ceil((from + offset) / stepMs) * stepMs - offset; t <= to; t += stepMs) {
    result.push(t);
  }
  return result;
}
