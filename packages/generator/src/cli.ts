import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { z } from 'zod';
import { generate } from './generate';
import { scenarioDefinitionSchema } from './scenario';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCENARIOS_DIR = join(ROOT, 'scenarios');
const DATASETS_DIR = join(ROOT, 'datasets');

const USAGE = `使い方: npm run generate -- <シナリオ名...> [--seed N]
       npm run generate -- --all`;

async function loadDefinition(name: string) {
  const path = join(SCENARIOS_DIR, `${name}.yaml`);
  const result = scenarioDefinitionSchema.safeParse(parse(await readFile(path, 'utf8')));
  if (!result.success) {
    throw new Error(`${path} の定義に誤りがあります:\n${z.prettifyError(result.error)}`);
  }
  if (result.data.name !== name) {
    throw new Error(`${path} の name(${result.data.name})がファイル名と一致しません`);
  }
  return result.data;
}

/** 一時ディレクトリに書いてから置き換え、途中で失敗しても前のデータセットを壊さない */
async function writeDataset(name: string, seed: number | undefined) {
  const dataset = generate(await loadDefinition(name), seed);
  const dir = join(DATASETS_DIR, name);
  const tmp = `${dir}.tmp`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const file of dataset.files) {
    await writeFile(join(tmp, file.name), file.lines.join('\n') + '\n');
  }
  await writeFile(join(tmp, 'scenario.json'), JSON.stringify(dataset.scenario, null, 2) + '\n');
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  console.log(`${name}: ${dataset.eventCount} 件 → ${dir}`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { all: { type: 'boolean' }, seed: { type: 'string' }, help: { type: 'boolean' } },
  });
  if (values.help) return console.log(USAGE);

  const seed = values.seed === undefined ? undefined : Number(values.seed);
  if (seed !== undefined && !Number.isInteger(seed)) throw new Error('--seed は整数で指定する');

  const names = values.all
    ? (await readdir(SCENARIOS_DIR))
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => basename(f, '.yaml'))
        .sort()
    : positionals;
  if (names.length === 0) throw new Error(USAGE);

  for (const name of names) await writeDataset(name, seed);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
