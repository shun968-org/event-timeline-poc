import { parse } from 'csv-parse/sync';
import type { SourceDefinition } from '@event-timeline/core';

/** 1行分の元データと、その行番号(1始まり、CSV はヘッダー行を含む) */
export interface SourceRecord {
  raw: Record<string, unknown>;
  line: number;
}

export interface ReadResult {
  records: SourceRecord[];
  /** 読めなかった行(JSON として壊れているなど) */
  errors: { line: number; reason: string }[];
}

export function readRecords(content: string, format: SourceDefinition['format']): ReadResult {
  return format === 'csv' ? readCsv(content) : readJsonLines(content);
}

function readCsv(content: string): ReadResult {
  const rows = parse(content, {
    columns: true,
    info: true,
    skip_empty_lines: true,
    bom: true,
  }) as { record: Record<string, string>; info: { lines: number } }[];
  return {
    records: rows.map(({ record, info }) => ({ raw: record, line: info.lines })),
    errors: [],
  };
}

function readJsonLines(content: string): ReadResult {
  const result: ReadResult = { records: [], errors: [] };
  content.split(/\r?\n/).forEach((text, i) => {
    if (text.trim() === '') return;
    const line = i + 1;
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        result.errors.push({ line, reason: 'オブジェクトではない' });
      } else {
        result.records.push({ raw: value as Record<string, unknown>, line });
      }
    } catch {
      result.errors.push({ line, reason: 'JSON として読めない' });
    }
  });
  return result;
}
