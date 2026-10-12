import { describe, expect, it } from 'vitest';
import { generate } from './generate';
import { scenarioDefinitionSchema } from './scenario';

const text = { ja: 'あ', en: 'a' };

const input = {
  name: 'test',
  kind: 'incident',
  seed: 42,
  start: '2026-10-01T00:00:00+09:00',
  noise: { events: 2000 },
  title: text,
  summary: text,
  howToStart: text,
  rootCause: text,
  story: [
    {
      at: '10:00:00',
      source: 'infra',
      type: 'deploy',
      severity: 'info',
      message: 'Deployed checkout-api v2.14.0',
      fields: { host: 'web-01' },
      answer: true,
    },
    {
      at: '10:02:00',
      source: 'app',
      type: 'db_timeout',
      severity: 'error',
      message: 'Timed out waiting for connection ({i})',
      ids: { trace: '{trace}', user: '{user}' },
      count: 50,
      over: '00:30:00',
      answer: true,
    },
    {
      at: '10:05:00',
      source: 'business',
      type: 'order_failed',
      severity: 'error',
      message: 'Order {order} failed',
      ids: { order: 'O-10023', user: 'U-12345' },
      answer: true,
    },
  ],
};

const definition = scenarioDefinitionSchema.parse(input);

function file(name: string, seed?: number) {
  const found = generate(definition, seed).files.find((f) => f.name === name);
  if (!found) throw new Error(`${name} が無い`);
  return found;
}

describe('generate', () => {
  it('同じシードなら同じデータになる', () => {
    expect(generate(definition)).toEqual(generate(definition));
  });

  it('シードを変えるとデータが変わる', () => {
    expect(file('app.jsonl', 1).lines).not.toEqual(file('app.jsonl', 2).lines);
  });

  it('筋書きとノイズを合わせた件数になる', () => {
    const { eventCount, files } = generate(definition);
    expect(eventCount).toBeGreaterThanOrEqual(2000 + 52);
    expect(eventCount).toBeLessThan(2000 + 52 + 20);
    const lines = files.reduce((sum, f) => sum + f.lines.length - (f.firstEventLine - 1), 0);
    expect(lines).toBe(eventCount);
  });

  it('正解の順序は筋書きの順で、ID が指す行に筋書きのイベントがある', () => {
    const { scenario, files } = generate(definition);
    const lineOf = (id: string) => {
      const [name, line] = id.split(':') as [string, string];
      return files.find((f) => f.name === name)?.lines[Number(line) - 1];
    };
    expect(scenario.answer.sequence.map(lineOf)).toEqual([
      expect.stringContaining('Deployed checkout-api v2.14.0'),
      expect.stringContaining('Timed out waiting for connection (1)'),
      expect.stringContaining('Order O-10023 failed'),
    ]);
  });

  it('情報源ごとに時刻の書き方が違う', () => {
    expect(file('app.jsonl').lines[0]).toMatch(/"timestamp":"2026-09-30T15:\d\d:\d\d\.\d{3}Z"/);
    expect(file('business.csv').lines[0]).toBe(
      'processed_at,event_type,status,order_id,customer_id,amount,detail',
    );
    expect(file('business.csv').lines[1]).toMatch(/^2026\/10\/01 \d\d:\d\d:\d\d,/);
    expect(file('infra.jsonl').lines[0]).toMatch(/^\{"ts":\d{13},/);
    expect(file('audit.csv').lines[1]).toMatch(/^2026-10-01T\d\d:\d\d:\d\d\+09:00,/);
  });

  it('ファイルの中は発生時刻順', () => {
    const times = file('infra.jsonl').lines.map((l) => (JSON.parse(l) as { ts: number }).ts);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('固定の ID はノイズに使われない', () => {
    const hits = file('business.csv').lines.filter((l) => l.includes('O-10023'));
    expect(hits).toHaveLength(1);
  });
});

describe('scenarioDefinitionSchema', () => {
  const story = input.story[0];

  it.each([
    ['情報源が持てない ID', { ...story, ids: { order: 'O-1' } }],
    ['情報源に無い項目', { ...story, fields: { amount: '100' } }],
    ['24時間を超える時刻', { ...story, at: '25:00:00' }],
    ['書式の誤った時刻', { ...story, at: '10:00' }],
    ['over の無い繰り返し', { ...story, count: 3 }],
  ])('%s はエラーにする', (_, bad) => {
    expect(scenarioDefinitionSchema.safeParse({ ...input, story: [bad] }).success).toBe(false);
  });

  it('正解のイベントが無いとエラーにする', () => {
    const result = scenarioDefinitionSchema.safeParse({
      ...input,
      story: [{ ...story, answer: false }],
    });
    expect(result.success).toBe(false);
  });
});
