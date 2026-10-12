import { describe, expect, it } from 'vitest';
import { datasetFileSchema, indexFileSchema } from './static-json';

const event = {
  id: 'e1',
  t: '2026-10-01T00:00:00.000Z',
  source: 'business',
  type: 'order_failed',
  severity: 'error',
  message: '在庫引当に失敗',
  ids: { order: ['O-1001'], user: ['U-1'] },
  raw: { status: 'NG', order_id: 'O-1001' },
  originalTime: '2026/10/01 09:00:00',
  file: 'business-1.csv',
  line: 2,
};

const text = { ja: 'あ', en: 'a' };

describe('datasetFileSchema', () => {
  const file = {
    dataset: 'checkout-outage',
    generatedAt: '2026-10-12T00:00:00Z',
    sources: [{ name: 'business', label: { ja: '業務処理履歴', en: 'Business records' } }],
    events: [event],
  };

  it('正しいデータセットを受け付ける', () => {
    expect(datasetFileSchema.parse(file).events[0]?.ids.order).toEqual(['O-1001']);
  });

  it.each([
    ['UTC でない発生時刻', { t: '2026-10-01T09:00:00+09:00' }],
    ['語彙に無い重要度', { severity: 'fatal' }],
    ['行番号が 0', { line: 0 }],
  ])('%s はエラーにする', (_, override) => {
    const bad = { ...file, events: [{ ...event, ...override }] };
    expect(datasetFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe('indexFileSchema', () => {
  it('シナリオ情報付きの一覧を受け付ける', () => {
    const index = {
      datasets: [
        {
          name: 'checkout-outage',
          eventCount: 1,
          from: '2026-10-01T00:00:00Z',
          to: '2026-10-02T00:00:00Z',
          sources: [],
          scenario: {
            kind: 'incident',
            title: text,
            summary: text,
            howToStart: text,
            answer: { rootCause: text, sequence: ['e1'] },
          },
        },
      ],
    };
    expect(indexFileSchema.safeParse(index).success).toBe(true);
  });
});
