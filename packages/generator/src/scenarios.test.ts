import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { generate } from './generate';
import { scenarioDefinitionSchema } from './scenario';

// リポジトリの検証シナリオ(scenarios/*.yaml)が、要件の規模に収まることを確かめる
const dir = resolve(import.meta.dirname, '../../../scenarios');
const names = readdirSync(dir).filter((f) => f.endsWith('.yaml'));

describe.each(names)('%s', (name) => {
  const definition = scenarioDefinitionSchema.parse(parse(readFileSync(join(dir, name), 'utf8')));
  const dataset = generate(definition);

  it('ファイル名と name が一致する', () => {
    expect(`${definition.name}.yaml`).toBe(name);
  });

  it('約1万件(上限1万件)', () => {
    expect(dataset.eventCount).toBeGreaterThanOrEqual(9000);
    expect(dataset.eventCount).toBeLessThanOrEqual(10000);
  });

  it('正解の順序が答えの数だけある', () => {
    const answers = definition.story
      .flatMap((story) => [story, ...story.then])
      .filter((body) => body.answer).length;
    expect(dataset.scenario.answer.sequence).toHaveLength(answers);
  });
});

it('検証シナリオは5本(障害3・問い合わせ2)', () => {
  const kinds = names.map(
    (name) => scenarioDefinitionSchema.parse(parse(readFileSync(join(dir, name), 'utf8'))).kind,
  );
  expect(kinds.filter((k) => k === 'incident')).toHaveLength(3);
  expect(kinds.filter((k) => k === 'inquiry')).toHaveLength(2);
});
