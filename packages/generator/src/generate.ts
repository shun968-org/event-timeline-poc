import { eventId, type Scenario } from '@event-timeline/core';
import { DateTime } from 'luxon';
import { IdFactory } from './ids';
import { generateNoise } from './noise';
import { createRng } from './rng';
import type { ScenarioDefinition } from './scenario';
import { expandStory, fixedIds } from './story';
import { writeSources, type OutputFile } from './writers';

export interface GeneratedDataset {
  files: OutputFile[];
  /** `scenario.json` の内容。正解の順序はイベント ID で持つ */
  scenario: Scenario;
  eventCount: number;
}

/** シナリオ定義から、データセット1つ分のファイルを作る。同じシードなら同じ結果になる */
export function generate(definition: ScenarioDefinition, seed = definition.seed): GeneratedDataset {
  const rng = createRng(seed);
  const ids = new IdFactory(rng, fixedIds(definition));
  const startMs = DateTime.fromISO(definition.start, { setZone: true }).toMillis();

  const story = expandStory(definition, startMs, rng, ids);
  const noise = generateNoise(startMs, Math.max(0, definition.noise.events), rng, ids);
  const { files, located } = writeSources([...story, ...noise]);

  const sequence = story
    .filter((e) => e.answerOrder !== undefined)
    .sort((a, b) => (a.answerOrder ?? 0) - (b.answerOrder ?? 0))
    .map((e) => {
      const at = located.get(e);
      if (!at) throw new Error('書き出されていないイベントが正解に含まれている');
      return eventId(at.file, at.line);
    });
  const [first, ...rest] = sequence;
  if (first === undefined) throw new Error('正解の順序が空');

  return {
    files,
    scenario: {
      kind: definition.kind,
      title: definition.title,
      summary: definition.summary,
      howToStart: definition.howToStart,
      answer: { rootCause: definition.rootCause, sequence: [first, ...rest] },
    },
    eventCount: story.length + noise.length,
  };
}
