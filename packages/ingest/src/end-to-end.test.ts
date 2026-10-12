import { generate, scenarioDefinitionSchema } from '@event-timeline/generator';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadDefinitions } from './definitions';
import { ingestDataset } from './ingest';

// リポジトリの検証シナリオを生成し、リポジトリの定義ファイル(sources/*.yaml)だけで取り込めることを確かめる
const ROOT = resolve(import.meta.dirname, '../../..');
let work: string;

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'e2e-'));
});
afterAll(() => rm(work, { recursive: true, force: true }));

const scenarioFiles = (await readdir(join(ROOT, 'scenarios'))).filter((f) => f.endsWith('.yaml'));

describe.each(scenarioFiles)('%s', (scenarioFile) => {
  it('全行を失敗なく取り込み、4情報源と正解の順序がそろう', async () => {
    const definition = scenarioDefinitionSchema.parse(
      parse(await readFile(join(ROOT, 'scenarios', scenarioFile), 'utf8')),
    );
    const dataset = generate(definition);
    const dir = join(work, definition.name);
    await mkdir(dir);
    for (const file of dataset.files)
      await writeFile(join(dir, file.name), file.lines.join('\n') + '\n');
    await writeFile(join(dir, 'scenario.json'), JSON.stringify(dataset.scenario));

    const definitions = await loadDefinitions(join(ROOT, 'sources'));
    // 正解の順序のイベントが無ければ ingestDataset が例外を投げる
    const { file, report } = await ingestDataset(dir, definition.name, definitions);

    expect(report.skipped).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(file.events).toHaveLength(dataset.eventCount);
    expect(file.sources.map((s) => s.name).sort()).toEqual(['app', 'audit', 'business', 'infra']);
    // 生成した期間(24時間)に収まる = タイムゾーンの解釈が正しい
    const start = new Date(definition.start).getTime();
    for (const event of [file.events[0], file.events.at(-1)]) {
      const t = new Date(event?.t ?? '').getTime();
      expect(t).toBeGreaterThanOrEqual(start);
      expect(t).toBeLessThan(start + 24 * 3600_000);
    }
  });
});
