import type { IdKind, Severity } from '@event-timeline/core';

/** 合成データの情報源。形式と時刻の書き方は writers.ts で決める */
export const SOURCES = ['app', 'business', 'infra', 'audit'] as const;
export type SourceName = (typeof SOURCES)[number];

/** 情報源ごとに持てる関連 ID(基本設計 F-07 の表) */
export const SOURCE_ID_KINDS: Record<SourceName, readonly IdKind[]> = {
  app: ['trace', 'user'],
  business: ['order', 'user'],
  infra: [],
  audit: ['user', 'order'],
};

/** 情報源ごとに、筋書きから上書きできる追加の項目 */
export const SOURCE_EXTRA_FIELDS: Record<SourceName, readonly string[]> = {
  app: ['service'],
  business: ['amount'],
  infra: ['host', 'service'],
  audit: ['actor'],
};

/** 書き出す前の、情報源に依らない形のイベント */
export interface SyntheticEvent {
  /** UTC の epoch ミリ秒 */
  at: number;
  source: SourceName;
  type: string;
  severity: Severity;
  message: string;
  ids: Partial<Record<IdKind, string>>;
  fields: Record<string, string>;
  /** 正解の順序に含める(順序はこの値の昇順) */
  answerOrder?: number;
}
