import { z } from 'zod';
import { idKindSchema, localizedTextSchema, severitySchema, sourceNameSchema } from './common';

/** UTC の ISO 8601(末尾 `Z`) */
const utcDateTimeSchema = z.iso.datetime();

export const sourceInfoSchema = z.object({
  name: sourceNameSchema,
  label: localizedTextSchema,
});
export type SourceInfo = z.infer<typeof sourceInfoSchema>;

/** 共通イベント形式。取り込み CLI が書き出し、画面が読む */
export const timelineEventSchema = z.object({
  /** データセット内で一意(`eventId` で作る) */
  id: z.string().min(1),
  /** 発生時刻(正規化済み) */
  t: utcDateTimeSchema,
  source: sourceNameSchema,
  type: z.string(),
  severity: severitySchema,
  message: z.string(),
  /** 関連 ID。1件が同じ種類の ID を複数持つこともある */
  ids: z.partialRecord(idKindSchema, z.array(z.string().min(1))),
  /** 元データの全項目 */
  raw: z.record(z.string(), z.unknown()),
  /** 元の時刻の文字列 */
  originalTime: z.string(),
  /** 元ファイル名と行番号(1始まり) */
  file: z.string().min(1),
  line: z.int().positive(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

/** `<データセット>.json`。events は発生順に並べ済み */
export const datasetFileSchema = z.object({
  dataset: z.string().min(1),
  generatedAt: utcDateTimeSchema,
  sources: z.array(sourceInfoSchema),
  events: z.array(timelineEventSchema),
});
export type DatasetFile = z.infer<typeof datasetFileSchema>;

/** シナリオ情報(紹介と答え合わせ) */
export const scenarioSchema = z.object({
  kind: z.enum(['incident', 'inquiry']),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  howToStart: localizedTextSchema,
  answer: z.object({
    rootCause: localizedTextSchema,
    /** 正解の発生順序を表すイベント ID */
    sequence: z.array(z.string().min(1)).nonempty(),
  }),
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const datasetSummarySchema = z.object({
  name: z.string().min(1),
  eventCount: z.int().nonnegative(),
  from: utcDateTimeSchema,
  to: utcDateTimeSchema,
  sources: z.array(sourceInfoSchema),
  scenario: scenarioSchema,
});
export type DatasetSummary = z.infer<typeof datasetSummarySchema>;

/** `index.json`。画面が最初に読む、データセットの一覧 */
export const indexFileSchema = z.object({
  datasets: z.array(datasetSummarySchema),
});
export type IndexFile = z.infer<typeof indexFileSchema>;
