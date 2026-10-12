import {
  eventId,
  ID_KINDS,
  SEVERITIES,
  type IdKind,
  type Severity,
  type SourceDefinition,
  type TimelineEvent,
} from '@event-timeline/core';
import type { SourceRecord } from './read';
import { normalizeTime } from './time';

function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function severityOf(raw: Record<string, unknown>, def: SourceDefinition): Severity {
  const rule = def.fields.severity;
  if (!rule) return 'info';
  const value = text(raw[rule.field]);
  const mapped = rule.map[value];
  if (mapped) return mapped;
  // 対応表に無くても、共通の語彙そのものなら使う
  const lower = value.toLowerCase();
  return (SEVERITIES as readonly string[]).includes(lower) ? (lower as Severity) : rule.default;
}

function idsOf(raw: Record<string, unknown>, def: SourceDefinition): TimelineEvent['ids'] {
  const ids: Partial<Record<IdKind, string[]>> = {};
  for (const kind of ID_KINDS) {
    const values = (def.ids[kind] ?? []).map((field) => text(raw[field]).trim()).filter(Boolean);
    if (values.length > 0) ids[kind] = [...new Set(values)];
  }
  return ids;
}

export type ConvertResult =
  { ok: true; event: TimelineEvent } | { ok: false; line: number; reason: string; value: string };

/** 1行を共通イベント形式に変換する */
export function convert(record: SourceRecord, file: string, def: SourceDefinition): ConvertResult {
  const { raw, line } = record;
  const originalTime = raw[def.time.field];
  const t = normalizeTime(originalTime, def.time);
  if (t === undefined) {
    return { ok: false, line, reason: '時刻を解析できない', value: text(originalTime) };
  }
  return {
    ok: true,
    event: {
      id: eventId(file, line),
      t,
      source: def.name,
      type: text(raw[def.fields.type]),
      severity: severityOf(raw, def),
      message: text(raw[def.fields.message]),
      ids: idsOf(raw, def),
      raw,
      originalTime: text(originalTime),
      file,
      line,
    },
  };
}

/** 発生時刻 → 情報源名 → ファイル名 → 行番号。同時刻でも毎回同じ並びになる(REQ-011) */
export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  // t は同じ書式(UTC・ミリ秒付き)なので文字列のまま比べられる。ロケールに依らない比較にする
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  return cmp(a.t, b.t) || cmp(a.source, b.source) || cmp(a.file, b.file) || a.line - b.line;
}
