import { ID_KINDS, type IdKind } from '@event-timeline/core';
import type { IdFactory } from './ids';
import type { SyntheticEvent } from './model';
import type { Rng } from './rng';
import type { ScenarioDefinition, StoryEvent } from './scenario';

const PLACEHOLDER = /^\{(order|user|trace)\}$/;

type Body = Pick<StoryEvent, 'source' | 'type' | 'severity' | 'message' | 'ids' | 'fields'>;

/**
 * 筋書きのイベントを、発生回数ぶんに展開する。
 * `{order}` などは発生ごとに1つの値に決め、その発生の `then` のイベントでも同じ値を使う。
 */
export function expandStory(
  scenario: ScenarioDefinition,
  startMs: number,
  rng: Rng,
  ids: IdFactory,
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [];
  // 正解の順序は、定義に書いた順(筋書きの行 → その then)
  let nextAnswerOrder = 0;

  for (const story of scenario.story) {
    const storyAnswer = story.answer ? nextAnswerOrder++ : undefined;
    const thenAnswers = story.then.map((next) => (next.answer ? nextAnswerOrder++ : undefined));
    const answered = new Set<number>();

    const emit = (
      body: Body,
      at: number,
      values: Map<IdKind, string>,
      i: number,
      answer?: number,
    ) => {
      const resolve = (kind: IdKind) => {
        let value = values.get(kind);
        if (value === undefined) {
          value = ids.next(kind);
          values.set(kind, value);
        }
        return value;
      };
      const resolved: Partial<Record<IdKind, string>> = {};
      for (const kind of ID_KINDS) {
        const value = body.ids[kind];
        if (value !== undefined) resolved[kind] = PLACEHOLDER.test(value) ? resolve(kind) : value;
      }
      const message = body.message
        .replace(/\{(order|user|trace)\}/g, (_, kind: IdKind) => resolved[kind] ?? resolve(kind))
        .replace(/\{i\}/g, String(i + 1));
      const first = answer !== undefined && !answered.has(answer);
      if (first) answered.add(answer);
      events.push({
        // 秒ちょうどにならないよう、ミリ秒を揺らす(ノイズと見分けがつかないように)
        at: at + rng.int(0, 999),
        source: body.source,
        type: body.type,
        severity: body.severity,
        message,
        ids: resolved,
        fields: { ...body.fields },
        ...(first ? { answerOrder: answer } : {}),
      });
    };

    const step = story.count > 1 ? (story.over ?? 0) / story.count : 0;
    for (let i = 0; i < story.count; i++) {
      // 2回目以降は over の間に均等に散らし、少し揺らす
      const jitter = i === 0 ? 0 : rng.int(0, Math.floor(step * 0.8));
      const at = startMs + story.at + Math.floor(step * i) + jitter;
      const values = new Map<IdKind, string>();
      emit(story, at, values, i, storyAnswer);
      story.then.forEach((next, j) => {
        // 最初の発生は必ず続ける(正解の順序に含めるため)
        if (i === 0 || rng.chance(next.chance)) {
          emit(next, at + next.after + rng.int(100, 900), values, i, thenAnswers[j]);
        }
      });
    }
  }
  return events;
}

/** 筋書きで固定に使っている ID(ノイズと衝突させない) */
export function fixedIds(scenario: ScenarioDefinition): string[] {
  return scenario.story
    .flatMap((story) => [story, ...story.then])
    .flatMap((body) => Object.values(body.ids).filter((value) => !PLACEHOLDER.test(value)));
}
