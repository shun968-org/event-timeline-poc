import type { TimelineEvent } from '@event-timeline/core';
import { describe, expect, it } from 'vitest';
import { eventFixture } from '../test-fixtures';
import { filterEvents, prepareEvents, type FilterCriteria } from './filter';
import { buildHistogram } from './histogram';

/** 非機能要件「性能」: 1データセット(最大1万件)で、絞り込み・関連 ID の抽出・キーワード検索が2秒以内 */
const LIMIT_MS = 2000;
const EVENT_COUNT = 10_000;
const FROM = Date.parse('2026-10-04T15:00:00.000Z');
const TO = Date.parse('2026-10-05T15:00:00.000Z');

function manyEvents(): TimelineEvent[] {
  const sources = ['app', 'audit', 'business', 'infra'];
  const severities = ['debug', 'info', 'warn', 'error', 'critical'] as const;
  return Array.from({ length: EVENT_COUNT }, (_, i) =>
    eventFixture({
      id: `events.jsonl:${i + 1}`,
      t: new Date(FROM + Math.floor(((TO - FROM) * i) / EVENT_COUNT)).toISOString(),
      source: sources[i % sources.length] ?? 'app',
      type: `type_${i % 20}`,
      severity: severities[i % severities.length] ?? 'info',
      message: `Request ${i} for order O-${10_000 + (i % 3000)} finished`,
      ids: { order: [`O-${10_000 + (i % 3000)}`], user: [`U-${i % 500}`], trace: [`t-${i}`] },
      line: i + 1,
    }),
  );
}

const EMPTY: FilterCriteria = { sources: [], types: [], severities: [] };

describe('1万件での処理時間(処理だけ。描画は含まない)', () => {
  const events = manyEvents();

  it.each<[string, FilterCriteria]>([
    ['絞り込みなし', EMPTY],
    [
      '情報源・重要度・期間',
      {
        ...EMPTY,
        sources: ['app', 'infra'],
        severities: ['error', 'critical'],
        from: '2026-10-05T00:00:00.000Z',
        to: '2026-10-05T06:00:00.000Z',
      },
    ],
    ['関連 ID の抽出', { ...EMPTY, idKind: 'order', idValue: 'o-10042' }],
    ['キーワード検索', { ...EMPTY, q: 'O-1004' }],
  ])('%s: 索引の作成と、絞り込み・グラフの計算が2秒以内', (_, criteria) => {
    const start = performance.now();
    const prepared = prepareEvents(events);
    const indexes = filterEvents(prepared, criteria);
    buildHistogram(
      filterEvents(prepared, criteria, { ignorePeriod: true }),
      prepared.times,
      () => 0,
      1,
      FROM,
      TO,
    );
    const elapsed = performance.now() - start;
    expect(indexes.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(LIMIT_MS);
  });
});
