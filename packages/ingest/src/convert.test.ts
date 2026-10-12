import { sourceDefinitionSchema, type TimelineEvent } from '@event-timeline/core';
import { describe, expect, it } from 'vitest';
import { compareEvents, convert } from './convert';

const def = sourceDefinitionSchema.parse({
  name: 'business',
  label: { ja: '業務処理履歴', en: 'Business records' },
  file: 'business*.csv',
  format: 'csv',
  time: { field: 'processed_at', format: 'yyyy/MM/dd HH:mm:ss', timezone: 'Asia/Tokyo' },
  fields: {
    type: 'event_type',
    message: 'detail',
    severity: { field: 'status', map: { OK: 'info', NG: 'error' }, default: 'warn' },
  },
  ids: { order: ['order_id', 'orderId'], user: ['customer_id'] },
});

const raw = {
  processed_at: '2026/10/01 12:15:42',
  event_type: 'order_failed',
  status: 'NG',
  order_id: 'O-1',
  orderId: 'O-2',
  customer_id: '',
  detail: 'Order failed',
};

describe('convert', () => {
  it('定義に従って共通イベント形式にする', () => {
    const result = convert({ raw, line: 2 }, 'business.csv', def);
    expect(result).toEqual({
      ok: true,
      event: {
        id: 'business.csv:2',
        t: '2026-10-01T03:15:42.000Z',
        source: 'business',
        type: 'order_failed',
        severity: 'error',
        message: 'Order failed',
        // 項目名が違っても同じ種類の ID にまとめ、空の値は除く
        ids: { order: ['O-1', 'O-2'] },
        raw,
        originalTime: '2026/10/01 12:15:42',
        file: 'business.csv',
        line: 2,
      },
    });
  });

  it.each([
    ['対応表にある値', 'OK', 'info'],
    ['共通の語彙そのもの', 'Critical', 'critical'],
    ['どちらでもない値は既定値', 'HOLD', 'warn'],
  ])('重要度: %s', (_, status, expected) => {
    const result = convert({ raw: { ...raw, status }, line: 2 }, 'business.csv', def);
    expect(result.ok && result.event.severity).toBe(expected);
  });

  it('時刻を解析できない行は理由と値を返す', () => {
    const result = convert({ raw: { ...raw, processed_at: 'N/A' }, line: 9 }, 'business.csv', def);
    expect(result).toEqual({ ok: false, line: 9, reason: '時刻を解析できない', value: 'N/A' });
  });
});

describe('compareEvents', () => {
  const base = { t: '2026-10-01T00:00:00.000Z', source: 'app', file: 'app.jsonl', line: 1 };
  const e = (over: Partial<TimelineEvent>) => ({ ...base, ...over }) as TimelineEvent;

  it('発生時刻 → 情報源名 → ファイル名 → 行番号の順に並べる', () => {
    const events = [
      e({ source: 'business', file: 'business.csv', line: 3 }),
      e({ t: '2026-10-01T00:00:00.001Z' }),
      e({ line: 5 }),
      e({ source: 'business', file: 'business.csv', line: 2 }),
      e({ line: 4 }),
    ];
    expect(events.sort(compareEvents).map((x) => `${x.t.slice(20)} ${x.source}:${x.line}`)).toEqual(
      ['000Z app:4', '000Z app:5', '000Z business:2', '000Z business:3', '001Z app:1'],
    );
  });
});
