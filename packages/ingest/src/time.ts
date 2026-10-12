import type { SourceDefinition } from '@event-timeline/core';
import { DateTime } from 'luxon';

/**
 * 元の時刻の値を UTC の ISO 8601(ミリ秒付き)に正規化する。解析できなければ undefined。
 * 時刻にタイムゾーンが無いときは、定義の `time.timezone` の時刻とみなす。
 */
export function normalizeTime(value: unknown, time: SourceDefinition['time']): string | undefined {
  let parsed: DateTime;
  switch (time.format) {
    case 'epoch_ms': {
      const ms = typeof value === 'number' ? value : Number(value);
      if (typeof value === 'string' && value.trim() === '') return undefined;
      if (!Number.isFinite(ms)) return undefined;
      parsed = DateTime.fromMillis(ms, { zone: 'utc' });
      break;
    }
    case 'iso8601':
      if (typeof value !== 'string') return undefined;
      parsed = DateTime.fromISO(value, { zone: time.timezone });
      break;
    default:
      if (typeof value !== 'string') return undefined;
      parsed = DateTime.fromFormat(value, time.format, { zone: time.timezone });
  }
  return parsed.isValid ? (parsed.toUTC().toISO() ?? undefined) : undefined;
}
