import { sourceDefinitionSchema, type SourceDefinition } from '@event-timeline/core';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

/** `sources/*.yaml` を読み、すべて検証する。1つでも不備があれば、まとめてエラーにする */
export async function loadDefinitions(dir: string): Promise<SourceDefinition[]> {
  const files = (await readdir(dir)).filter((f) => /\.ya?ml$/.test(f)).sort();
  const definitions: SourceDefinition[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const path = join(dir, file);
    let data: unknown;
    try {
      data = parse(await readFile(path, 'utf8'));
    } catch (error) {
      problems.push(`${path}: YAML として読めない(${(error as Error).message})`);
      continue;
    }
    const result = sourceDefinitionSchema.safeParse(data);
    if (result.success) definitions.push(result.data);
    else problems.push(`${path}:\n${z.prettifyError(result.error)}`);
  }
  const names = definitions.map((d) => d.name);
  const duplicated = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicated.length > 0)
    problems.push(`情報源名が重複している: ${[...new Set(duplicated)].join(', ')}`);
  if (files.length === 0) problems.push(`${dir} に定義ファイルが無い`);
  if (problems.length > 0) throw new Error(`情報源の定義に誤りがあります:\n${problems.join('\n')}`);
  return definitions;
}
