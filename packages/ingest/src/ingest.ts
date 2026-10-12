import {
  scenarioSchema,
  type DatasetFile,
  type DatasetSummary,
  type SourceDefinition,
  type TimelineEvent,
} from '@event-timeline/core';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { compareEvents, convert } from './convert';
import { matchesPattern } from './glob';
import { readRecords } from './read';

export interface Problem {
  file: string;
  line?: number;
  reason: string;
  value?: string;
}

export interface IngestReport {
  /** 情報源ごとの取り込み件数 */
  counts: Record<string, number>;
  /** 飛ばした行(時刻を解析できないなど) */
  skipped: Problem[];
  /** 処理は続けたが、確認が要るもの(一致するファイルが無いなど) */
  warnings: string[];
}

export interface IngestResult {
  file: DatasetFile;
  summary: DatasetSummary;
  report: IngestReport;
}

/** データセットのディレクトリを読み、画面が読む静的 JSON の内容を作る */
export async function ingestDataset(
  dir: string,
  name: string,
  definitions: readonly SourceDefinition[],
  now = new Date(),
): Promise<IngestResult> {
  const report: IngestReport = { counts: {}, skipped: [], warnings: [] };
  const names = (await readdir(dir)).sort();
  const events: TimelineEvent[] = [];
  const used: SourceDefinition[] = [];

  for (const def of definitions) {
    const files = names.filter((f) => matchesPattern(f, def.file));
    if (files.length === 0) {
      report.warnings.push(`${def.name}: ${def.file} に一致するファイルが無い`);
      continue;
    }
    used.push(def);
    report.counts[def.name] = 0;
    for (const file of files) {
      const { records, errors } = readRecords(await readFile(join(dir, file), 'utf8'), def.format);
      for (const error of errors) report.skipped.push({ file, ...error });
      for (const record of records) {
        const result = convert(record, file, def);
        if (result.ok) {
          events.push(result.event);
          report.counts[def.name] = (report.counts[def.name] ?? 0) + 1;
        } else {
          report.skipped.push({
            file,
            line: result.line,
            reason: result.reason,
            value: result.value,
          });
        }
      }
    }
  }
  events.sort(compareEvents);

  const scenario = await readScenario(join(dir, 'scenario.json'));
  const known = new Set(events.map((e) => e.id));
  const missing = scenario.answer.sequence.filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw new Error(`${name}: 正解の順序にあるイベントが取り込まれていない: ${missing.join(', ')}`);
  }

  const first = events[0];
  const last = events.at(-1);
  if (!first || !last) throw new Error(`${name}: 取り込めたイベントが1件も無い`);

  const sources = used.map((def) => ({ name: def.name, label: def.label }));
  return {
    file: { dataset: name, generatedAt: now.toISOString(), sources, events },
    summary: { name, eventCount: events.length, from: first.t, to: last.t, sources, scenario },
    report,
  };
}

async function readScenario(path: string) {
  let data: unknown;
  try {
    data = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path} を読めない(${(error as Error).message})`, { cause: error });
  }
  const result = scenarioSchema.safeParse(data);
  if (!result.success)
    throw new Error(`${path} に誤りがあります:\n${z.prettifyError(result.error)}`);
  return result.data;
}
