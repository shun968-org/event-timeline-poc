import { describe, expect, it } from 'vitest';
import { normalizeTime } from './time';

describe('normalizeTime', () => {
  it.each([
    ['ISO 8601・UTC', '2026-10-01T03:15:42.123Z', 'iso8601', 'UTC', '2026-10-01T03:15:42.123Z'],
    ['ISO 8601・+09:00', '2026-10-01T12:15:42+09:00', 'iso8601', 'UTC', '2026-10-01T03:15:42.000Z'],
    [
      'ISO 8601・オフセット無しは定義のタイムゾーン',
      '2026-10-01T12:15:42',
      'iso8601',
      'Asia/Tokyo',
      '2026-10-01T03:15:42.000Z',
    ],
    ['UNIX 時刻(数値)', 1790824542123, 'epoch_ms', 'UTC', '2026-10-01T03:15:42.123Z'],
    ['UNIX 時刻(文字列)', '1790824542123', 'epoch_ms', 'UTC', '2026-10-01T03:15:42.123Z'],
    [
      '書式・タイムゾーン無しの日本時間',
      '2026/10/01 12:15:42',
      'yyyy/MM/dd HH:mm:ss',
      'Asia/Tokyo',
      '2026-10-01T03:15:42.000Z',
    ],
  ])('%s', (_, value, format, timezone, expected) => {
    expect(normalizeTime(value, { field: 'x', format, timezone })).toBe(expected);
  });

  it.each([
    ['書式に合わない', '2026-10-01 12:15', 'yyyy/MM/dd HH:mm:ss'],
    ['ISO 8601 でない', 'yesterday', 'iso8601'],
    ['数値でない', 'abc', 'epoch_ms'],
    ['空', '', 'epoch_ms'],
    ['値が無い', undefined, 'iso8601'],
  ])('%s なら undefined', (_, value, format) => {
    expect(normalizeTime(value, { field: 'x', format, timezone: 'UTC' })).toBeUndefined();
  });
});
