import { describe, expect, it } from 'vitest';
import { formatDateTime, formatShort, formatTick, ticks } from './time-format';

const t = Date.parse('2026-10-04T15:30:01.234Z');

describe('時刻の表示', () => {
  it('日本時間と UTC', () => {
    expect(formatDateTime(t, 'jst')).toBe('2026-10-05 00:30:01.234');
    expect(formatDateTime(t, 'utc')).toBe('2026-10-04 15:30:01.234');
    expect(formatShort(t, 'jst')).toBe('10-05 00:30:01.234');
  });

  it('目盛りは表示するタイムゾーンで揃え、日付が変わるところは日付も出す', () => {
    const from = Date.parse('2026-10-04T13:10:00Z');
    const to = Date.parse('2026-10-04T19:00:00Z');
    const jst = ticks(from, to, 3 * 3_600_000, 'jst');
    expect(jst.map((x) => formatTick(x, 'jst'))).toEqual(['10-05 00:00', '03:00']);
    expect(ticks(from, to, 3 * 3_600_000, 'utc').map((x) => formatTick(x, 'utc'))).toEqual([
      '15:00',
      '18:00',
    ]);
  });
});
