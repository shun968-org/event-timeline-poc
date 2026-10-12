import type { Severity } from '@event-timeline/core';
import { DateTime } from 'luxon';
import type { SourceName, SyntheticEvent } from './model';

/** 書き出すファイル。lines は1行目から順に並ぶ(CSV はヘッダーを含む) */
export interface OutputFile {
  name: string;
  lines: string[];
  /** イベント1件目の行番号(1始まり) */
  firstEventLine: number;
}

const JST = 'Asia/Tokyo';

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(values: readonly string[]): string {
  return values.map(csvCell).join(',');
}

/** 値が無い項目は書かない(実際のログに近づける) */
function jsonLine(record: Record<string, string | number | undefined>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined)),
  );
}

const APP_LEVEL: Record<Severity, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  critical: 'FATAL',
};
const BUSINESS_STATUS: Record<Severity, string> = {
  debug: 'OK',
  info: 'OK',
  warn: 'RETRY',
  error: 'NG',
  critical: 'NG',
};
const INFRA_SEVERITY: Record<Severity, string> = {
  debug: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
  critical: 'critical',
};

/**
 * 情報源ごとの形式。時刻の書き方を変え、取り込みの時刻正規化(REQ-003)の検証になるようにする。
 * - app: JSON Lines、ISO 8601・UTC
 * - business: CSV、タイムゾーン無しの日本時間
 * - infra: JSON Lines、UNIX 時刻(ミリ秒)
 * - audit: CSV、ISO 8601・+09:00
 */
const FORMATS: Record<
  SourceName,
  { file: string; header?: readonly string[]; line: (e: SyntheticEvent) => string }
> = {
  app: {
    file: 'app.jsonl',
    line: (e) =>
      jsonLine({
        timestamp: new Date(e.at).toISOString(),
        level: APP_LEVEL[e.severity],
        service: e.fields['service'] ?? 'checkout-api',
        event: e.type,
        msg: e.message,
        trace_id: e.ids.trace,
        user_id: e.ids.user,
      }),
  },
  business: {
    file: 'business.csv',
    header: ['processed_at', 'event_type', 'status', 'order_id', 'customer_id', 'amount', 'detail'],
    line: (e) =>
      csvRow([
        DateTime.fromMillis(e.at, { zone: JST }).toFormat('yyyy/MM/dd HH:mm:ss'),
        e.type,
        BUSINESS_STATUS[e.severity],
        e.ids.order ?? '',
        e.ids.user ?? '',
        e.fields['amount'] ?? '',
        e.message,
      ]),
  },
  infra: {
    file: 'infra.jsonl',
    line: (e) =>
      jsonLine({
        ts: e.at,
        host: e.fields['host'] ?? 'web-01',
        service: e.fields['service'] ?? 'checkout-api',
        kind: e.type,
        severity: INFRA_SEVERITY[e.severity],
        summary: e.message,
      }),
  },
  audit: {
    file: 'audit.csv',
    // 注文 ID の列名を業務処理履歴(order_id)とわざと変え、項目名の対応付け(REQ-004)を検証する
    header: ['occurred_at', 'actor', 'action', 'result', 'target_user', 'orderId', 'note'],
    line: (e) =>
      csvRow([
        DateTime.fromMillis(e.at, { zone: JST }).toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
        e.fields['actor'] ?? e.ids.user ?? 'system',
        e.type,
        e.severity === 'error' || e.severity === 'critical' ? 'failure' : 'success',
        e.ids.user ?? '',
        e.ids.order ?? '',
        e.message,
      ]),
  },
};

/**
 * 情報源ごとにファイルへ書き出す。各ファイルの中は発生時刻順。
 * 戻り値の `located` は、イベントが書かれたファイル名と行番号(正解の順序を ID にするため)。
 */
export function writeSources(events: readonly SyntheticEvent[]): {
  files: OutputFile[];
  located: Map<SyntheticEvent, { file: string; line: number }>;
} {
  const files: OutputFile[] = [];
  const located = new Map<SyntheticEvent, { file: string; line: number }>();
  for (const [source, format] of Object.entries(FORMATS) as [
    SourceName,
    (typeof FORMATS)[SourceName],
  ][]) {
    const own = events.filter((e) => e.source === source).sort((a, b) => a.at - b.at);
    const lines = format.header ? [csvRow(format.header)] : [];
    const firstEventLine = lines.length + 1;
    own.forEach((e, i) => {
      lines.push(format.line(e));
      located.set(e, { file: format.file, line: firstEventLine + i });
    });
    files.push({ name: format.file, lines, firstEventLine });
  }
  return { files, located };
}
