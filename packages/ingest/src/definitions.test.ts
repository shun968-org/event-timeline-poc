import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDefinitions } from './definitions';

const valid = `
name: app
label: { ja: アプリ, en: App }
file: "app*.jsonl"
format: jsonl
time: { field: timestamp, format: iso8601 }
fields: { type: event, message: msg }
`;

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sources-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('loadDefinitions', () => {
  it('YAML の定義を読んで検証する', async () => {
    await writeFile(join(dir, 'app.yaml'), valid);
    expect((await loadDefinitions(dir)).map((d) => d.name)).toEqual(['app']);
  });

  it('不備はファイル名と項目名を付けて、まとめてエラーにする', async () => {
    await writeFile(join(dir, 'a.yaml'), valid.replace('format: jsonl', 'format: xml'));
    await writeFile(join(dir, 'b.yaml'), valid.replace('en: App', 'en: ""'));
    const error = await loadDefinitions(dir).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/a\.yaml[\s\S]*format[\s\S]*b\.yaml[\s\S]*label\.en/);
  });

  it('情報源名の重複をエラーにする', async () => {
    await writeFile(join(dir, 'a.yaml'), valid);
    await writeFile(join(dir, 'b.yaml'), valid);
    await expect(loadDefinitions(dir)).rejects.toThrow('情報源名が重複している: app');
  });
});
