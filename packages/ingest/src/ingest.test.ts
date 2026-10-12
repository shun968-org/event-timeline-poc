import { sourceDefinitionSchema } from '@event-timeline/core';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingestDataset } from './ingest';

const text = { ja: 'あ', en: 'a' };

const definitions = [
  sourceDefinitionSchema.parse({
    name: 'app',
    label: { ja: 'アプリ', en: 'App' },
    file: 'app*.jsonl',
    format: 'jsonl',
    time: { field: 'timestamp', format: 'iso8601' },
    fields: { type: 'event', message: 'msg' },
    ids: { user: ['user_id'] },
  }),
  sourceDefinitionSchema.parse({
    name: 'audit',
    label: { ja: '監査', en: 'Audit' },
    file: 'audit*.csv',
    format: 'csv',
    time: { field: 'occurred_at', format: 'iso8601' },
    fields: { type: 'action', message: 'note' },
    ids: { user: ['target_user'] },
  }),
  sourceDefinitionSchema.parse({
    name: 'infra',
    label: { ja: '監視', en: 'Infra' },
    file: 'infra*.jsonl',
    format: 'jsonl',
    time: { field: 'ts', format: 'epoch_ms' },
    fields: { type: 'kind', message: 'summary' },
  }),
];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ingest-'));
  await writeFile(
    join(dir, 'app.jsonl'),
    [
      '{"timestamp":"2026-10-01T00:00:02.000Z","event":"login_failed","msg":"Login failed","user_id":"U-1"}',
      '',
      '{"timestamp":"broken","event":"x","msg":"x"}',
      '{not json',
      '{"timestamp":"2026-10-01T00:00:01.000Z","event":"login_failed","msg":"Login failed","user_id":"U-1"}',
    ].join('\n'),
  );
  await writeFile(
    join(dir, 'audit.csv'),
    'occurred_at,action,note,target_user\n2026-10-01T09:00:01+09:00,account_locked,"Locked, 5 attempts",U-1\n',
  );
  await writeFile(
    join(dir, 'scenario.json'),
    JSON.stringify({
      kind: 'inquiry',
      title: text,
      summary: text,
      howToStart: text,
      answer: { rootCause: text, sequence: ['app.jsonl:5', 'audit.csv:2'] },
    }),
  );
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe('ingestDataset', () => {
  it('全情報源を発生順に並べ、一覧の要約を作る', async () => {
    const now = new Date('2026-10-12T00:00:00Z');
    const { file, summary } = await ingestDataset(dir, 'demo', definitions, now);
    expect(file.events.map((e) => e.id)).toEqual(['app.jsonl:5', 'audit.csv:2', 'app.jsonl:1']);
    expect(file.events[1]?.message).toBe('Locked, 5 attempts');
    expect(file.generatedAt).toBe('2026-10-12T00:00:00.000Z');
    expect(summary).toMatchObject({
      name: 'demo',
      eventCount: 3,
      from: '2026-10-01T00:00:01.000Z',
      to: '2026-10-01T00:00:02.000Z',
      sources: [{ name: 'app' }, { name: 'audit' }],
      scenario: { kind: 'inquiry' },
    });
  });

  it('読めない行は飛ばして報告し、一致するファイルが無い情報源は警告する', async () => {
    const { report } = await ingestDataset(dir, 'demo', definitions);
    expect(report.counts).toEqual({ app: 2, audit: 1 });
    expect(report.skipped).toEqual([
      { file: 'app.jsonl', line: 4, reason: 'JSON として読めない' },
      { file: 'app.jsonl', line: 3, reason: '時刻を解析できない', value: 'broken' },
    ]);
    expect(report.warnings).toEqual(['infra: infra*.jsonl に一致するファイルが無い']);
  });

  it('正解の順序のイベントが無ければエラーにする', async () => {
    await writeFile(
      join(dir, 'scenario.json'),
      JSON.stringify({
        kind: 'inquiry',
        title: text,
        summary: text,
        howToStart: text,
        answer: { rootCause: text, sequence: ['app.jsonl:3'] },
      }),
    );
    await expect(ingestDataset(dir, 'demo', definitions)).rejects.toThrow('app.jsonl:3');
  });
});
