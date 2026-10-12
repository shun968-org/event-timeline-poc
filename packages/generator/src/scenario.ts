import { ID_KINDS, localizedTextSchema, severitySchema, type IdKind } from '@event-timeline/core';
import { DateTime, Duration } from 'luxon';
import { z } from 'zod';
import { SOURCE_EXTRA_FIELDS, SOURCE_ID_KINDS, SOURCES } from './model';

/** シナリオの期間(24時間) */
export const SCENARIO_HOURS = 24;

/** `HH:mm:ss`(開始からの経過時間)をミリ秒にする */
function parseOffset(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, h, m, s] = match.map(Number) as [number, number, number, number];
  if (m > 59 || s > 59) return undefined;
  return Duration.fromObject({ hours: h, minutes: m, seconds: s }).toMillis();
}

const offsetSchema = z.string().transform((value, ctx) => {
  const ms = parseOffset(value);
  if (ms === undefined || ms > SCENARIO_HOURS * 3600_000) {
    ctx.addIssue({
      code: 'custom',
      message: `00:00:00〜${SCENARIO_HOURS}:00:00 の HH:mm:ss で書く`,
    });
    return z.NEVER;
  }
  return ms;
});

/**
 * 関連 ID の値。固定の値か、`{order}` のように書くと発生ごとにランダムな値になる。
 * `{order}` などは1回の発生ごとに1つの値に決まり、`then` のイベントとメッセージでも同じ値になる。
 */
const idValueSchema = z.string().min(1);

/** イベントの中身(筋書きの行と `then` で共通) */
const eventBodyShape = {
  source: z.enum(SOURCES),
  type: z.string().min(1),
  severity: severitySchema,
  /** `{order}` `{user}` `{trace}` `{i}`(何回目か)を埋め込める */
  message: z.string().min(1),
  ids: z.partialRecord(z.enum(ID_KINDS), idValueSchema).default({}),
  fields: z.record(z.string(), z.string()).default({}),
  /** 正解の順序に含める(含めるのは最初に発生した1件) */
  answer: z.boolean().default(false),
};

type EventBody = z.output<z.ZodObject<typeof eventBodyShape>>;

/** 情報源が持てない ID・使えない項目をエラーにする */
function checkSource(event: EventBody, ctx: z.RefinementCtx) {
  for (const kind of Object.keys(event.ids) as IdKind[]) {
    if (!SOURCE_ID_KINDS[event.source].includes(kind)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ids', kind],
        message: `${event.source} は ${kind} の ID を持てない`,
      });
    }
  }
  for (const field of Object.keys(event.fields)) {
    if (!SOURCE_EXTRA_FIELDS[event.source].includes(field)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fields', field],
        message: `${event.source} で使える項目は ${SOURCE_EXTRA_FIELDS[event.source].join(', ') || 'なし'}`,
      });
    }
  }
}

/** 発生のたびに続けて起きるイベント(例: タイムアウトのあとの注文失敗) */
const followEventSchema = z
  .strictObject({
    ...eventBodyShape,
    /** 元のイベントからの遅れ(HH:mm:ss) */
    after: offsetSchema.default(0),
    /** 続けて起きる割合(0〜1) */
    chance: z.number().min(0).max(1).default(1),
  })
  .superRefine(checkSource);

const storyEventSchema = z
  .strictObject({
    ...eventBodyShape,
    /** 開始からの経過時間(HH:mm:ss) */
    at: offsetSchema,
    /** 発生回数。2以上なら `over` の間に散らばる */
    count: z.int().positive().default(1),
    over: offsetSchema.optional(),
    then: z.array(followEventSchema).default([]),
  })
  .superRefine((event, ctx) => {
    checkSource(event, ctx);
    if (event.count > 1 && event.over === undefined) {
      ctx.addIssue({ code: 'custom', path: ['over'], message: 'count が2以上なら over が要る' });
    }
  });
export type StoryEvent = z.output<typeof storyEventSchema>;

/** シナリオ定義(`scenarios/*.yaml`) */
export const scenarioDefinitionSchema = z
  .strictObject({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    kind: z.enum(['incident', 'inquiry']),
    seed: z.int().nonnegative(),
    /** 期間の開始時刻(オフセット付きの ISO 8601) */
    start: z.string().refine((value) => DateTime.fromISO(value, { setZone: true }).isValid, {
      message: 'ISO 8601 で書く',
    }),
    /** 平常時のイベントのおおよその件数 */
    noise: z.strictObject({ events: z.int().nonnegative() }),
    title: localizedTextSchema,
    summary: localizedTextSchema,
    howToStart: localizedTextSchema,
    rootCause: localizedTextSchema,
    story: z.array(storyEventSchema).nonempty(),
  })
  .refine(
    (scenario) =>
      scenario.story.some((event) => event.answer || event.then.some((next) => next.answer)),
    {
      path: ['story'],
      message: 'answer: true のイベントが1つ以上要る',
    },
  );
export type ScenarioDefinition = z.output<typeof scenarioDefinitionSchema>;
