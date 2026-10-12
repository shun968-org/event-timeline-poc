import { ID_KINDS, type IdKind } from '@event-timeline/core';
import type { IdFactory } from './ids';
import type { SyntheticEvent } from './model';
import type { Rng } from './rng';
import type { ScenarioDefinition } from './scenario';

const PLACEHOLDER = /^\{(order|user|trace)\}$/;

/** 筋書きのイベントを、発生回数ぶんに展開する */
export function expandStory(
  scenario: ScenarioDefinition,
  startMs: number,
  rng: Rng,
  ids: IdFactory,
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [];
  let answerOrder = 0;
  for (const story of scenario.story) {
    for (let i = 0; i < story.count; i++) {
      // 2回目以降は over の間に均等に散らし、少し揺らす
      const step = story.count > 1 ? (story.over ?? 0) / story.count : 0;
      const jitter = i === 0 ? 0 : rng.int(0, Math.floor(step * 0.8));
      const resolved: Partial<Record<IdKind, string>> = {};
      for (const kind of ID_KINDS) {
        const value = story.ids[kind];
        if (value === undefined) continue;
        resolved[kind] = PLACEHOLDER.test(value) ? ids.next(kind) : value;
      }
      const message = story.message
        .replace(/\{(order|user|trace)\}/g, (_, kind: IdKind) => resolved[kind] ?? ids.next(kind))
        .replace(/\{i\}/g, String(i + 1));
      events.push({
        at: startMs + story.at + Math.floor(step * i) + jitter,
        source: story.source,
        type: story.type,
        severity: story.severity,
        message,
        ids: resolved,
        fields: { ...story.fields },
        ...(story.answer && i === 0 ? { answerOrder: answerOrder++ } : {}),
      });
    }
  }
  return events;
}

/** 筋書きで固定に使っている ID(ノイズと衝突させない) */
export function fixedIds(scenario: ScenarioDefinition): string[] {
  return scenario.story.flatMap((story) =>
    Object.values(story.ids).filter((value) => !PLACEHOLDER.test(value)),
  );
}
