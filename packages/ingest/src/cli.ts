import { indexFileSchema, type DatasetSummary } from '@event-timeline/core';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadDefinitions } from './definitions';
import { ingestDataset, type IngestReport } from './ingest';

const ROOT = resolve(import.meta.dirname, '../../..');
const SOURCES_DIR = join(ROOT, 'sources');
const DATASETS_DIR = join(ROOT, 'datasets');
const OUTPUT_DIR = join(ROOT, 'packages/web/public/data');

/** 飛ばした行の警告は、多すぎると読めないので先頭だけ出す */
const MAX_SKIPPED_SHOWN = 20;

const USAGE = `使い方: npm run ingest -- <データセット名...>
       npm run ingest -- --all`;

/** 一時ファイルに書いてから置き換え、途中で失敗しても前の JSON を残す */
async function writeAtomic(path: string, content: string) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, content);
  await rename(tmp, path);
}

function printReport(name: string, report: IngestReport, total: number) {
  const counts = Object.entries(report.counts)
    .map(([source, count]) => `${source} ${count}`)
    .join(', ');
  console.log(`${name}: ${total} 件(${counts})、飛ばした行 ${report.skipped.length} 件`);
  for (const warning of report.warnings) console.warn(`  警告: ${warning}`);
  for (const p of report.skipped.slice(0, MAX_SKIPPED_SHOWN)) {
    console.warn(
      `  飛ばした行: ${p.file}:${p.line ?? '-'} ${p.reason}${p.value ? `(${p.value})` : ''}`,
    );
  }
  if (report.skipped.length > MAX_SKIPPED_SHOWN) {
    console.warn(`  ほか ${report.skipped.length - MAX_SKIPPED_SHOWN} 行`);
  }
}

async function readIndex(): Promise<DatasetSummary[]> {
  try {
    return indexFileSchema.parse(JSON.parse(await readFile(join(OUTPUT_DIR, 'index.json'), 'utf8')))
      .datasets;
  } catch {
    return [];
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { all: { type: 'boolean' }, help: { type: 'boolean' } },
  });
  if (values.help) return console.log(USAGE);

  let names = positionals;
  if (values.all) {
    const entries = await readdir(DATASETS_DIR, { withFileTypes: true });
    names = entries
      .filter((e) => e.isDirectory() && !e.name.endsWith('.tmp'))
      .map((e) => e.name)
      .sort();
  }
  if (names.length === 0) throw new Error(USAGE);
  for (const name of names) {
    if (!(await stat(join(DATASETS_DIR, name)).catch(() => undefined))?.isDirectory()) {
      throw new Error(
        `データセット ${name} が ${DATASETS_DIR} に無い(先に npm run generate を実行する)`,
      );
    }
  }

  // 定義の不備は、取り込みを始める前に止める
  const definitions = await loadDefinitions(SOURCES_DIR);
  await mkdir(OUTPUT_DIR, { recursive: true });

  // --all のときは一覧を作り直し、個別のときは既存の一覧の該当分だけ置き換える
  const summaries = new Map((values.all ? [] : await readIndex()).map((s) => [s.name, s]));
  for (const name of names) {
    const { file, summary, report } = await ingestDataset(
      join(DATASETS_DIR, name),
      name,
      definitions,
    );
    await writeAtomic(join(OUTPUT_DIR, `${name}.json`), JSON.stringify(file));
    summaries.set(name, summary);
    printReport(name, report, file.events.length);
  }
  const datasets = [...summaries.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
  await writeAtomic(join(OUTPUT_DIR, 'index.json'), JSON.stringify({ datasets }, null, 2) + '\n');
  console.log(`→ ${OUTPUT_DIR}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
