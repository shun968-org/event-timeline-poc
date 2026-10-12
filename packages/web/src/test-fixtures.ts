import type { DatasetFile, DatasetSummary, IndexFile, TimelineEvent } from '@event-timeline/core';
import type { DataSource } from './data/data-source';

/** テスト用のデータセットの要約 */
export function summaryFixture(overrides: Partial<DatasetSummary> = {}): DatasetSummary {
  return {
    name: 's5-login-locked',
    eventCount: 3,
    from: '2026-10-04T15:00:00.000Z',
    to: '2026-10-05T15:00:00.000Z',
    sources: [
      { name: 'app', label: { ja: 'アプリ', en: 'Application' } },
      { name: 'audit', label: { ja: '監査', en: 'Audit' } },
    ],
    scenario: {
      kind: 'inquiry',
      title: { ja: 'ログインできない', en: 'Cannot log in' },
      summary: { ja: '紹介', en: 'Summary' },
      howToStart: { ja: 'ユーザー ID で絞り込もう', en: 'Filter by user ID' },
      answer: {
        rootCause: { ja: 'パスワード誤りの連続', en: 'Repeated wrong passwords' },
        sequence: ['app.jsonl:1', 'audit.csv:2'],
      },
    },
    ...overrides,
  };
}

/** テスト用のイベント */
export function eventFixture(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'app.jsonl:1',
    t: '2026-10-05T01:00:00.000Z',
    source: 'app',
    type: 'login_failed',
    severity: 'warn',
    message: 'Login failed: wrong password',
    ids: { user: ['U-77102'] },
    raw: { level: 'WARN', msg: 'Login failed: wrong password' },
    originalTime: '2026-10-05T01:00:00.000Z',
    file: 'app.jsonl',
    line: 1,
    ...overrides,
  };
}

export function datasetFixture(events: TimelineEvent[], name = 's5-login-locked'): DatasetFile {
  return {
    dataset: name,
    generatedAt: '2026-10-12T00:00:00.000Z',
    sources: summaryFixture().sources,
    events,
  };
}

/** メモリ上のデータを返すデータソース */
export function memoryDataSource(index: IndexFile, datasets: DatasetFile[]): DataSource {
  return {
    loadIndex: () => Promise.resolve(index),
    loadDataset: (name) => {
      const found = datasets.find((d) => d.dataset === name);
      return found ? Promise.resolve(found) : Promise.reject(new Error(`no dataset ${name}`));
    },
  };
}
