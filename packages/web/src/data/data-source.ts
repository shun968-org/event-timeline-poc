import {
  datasetFileSchema,
  indexFileSchema,
  type DatasetFile,
  type IndexFile,
} from '@event-timeline/core';
import { z } from 'zod';
import { measure, recordMeasurement } from '../perf';

/**
 * 画面のデータの読み方。PoC では静的 JSON を読むが、PoC 後に API を足す場合は
 * 実装を追加して切り替える(ADR-0002)
 */
export interface DataSource {
  loadIndex(): Promise<IndexFile>;
  loadDataset(name: string): Promise<DatasetFile>;
}

export class DataLoadError extends Error {
  override name = 'DataLoadError';
}

/** 取り込み CLI が書き出した静的 JSON(`<baseUrl>index.json`・`<baseUrl><データセット>.json`)を読む */
export function createStaticDataSource(
  baseUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): DataSource {
  async function load<T>(file: string, schema: z.ZodType<T>): Promise<T> {
    const url = `${baseUrl}${file}`;
    let body: unknown;
    const start = performance.now();
    try {
      const response = await fetchFn(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      body = await response.json();
    } catch (error) {
      throw new DataLoadError(`${url} を読み込めません: ${String(error)}`, { cause: error });
    }
    recordMeasurement('fetch', performance.now() - start);
    const result = measure('validate', () => schema.safeParse(body));
    if (!result.success) {
      throw new DataLoadError(`${url} の形式が正しくありません:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
  }

  return {
    loadIndex: () => load('index.json', indexFileSchema),
    loadDataset: (name) => load(`${encodeURIComponent(name)}.json`, datasetFileSchema),
  };
}

/**
 * 読み込みの Promise をキーごとに使い回す(React の `use` に同じ Promise を渡すため)。
 * 失敗した読み込みは捨て、次に開いたときに読み直す。
 */
export function createCachedDataSource(source: DataSource): DataSource {
  const cache = new Map<string, Promise<unknown>>();
  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    let promise = cache.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = load();
      promise.catch(() => cache.delete(key));
      cache.set(key, promise);
    }
    return promise;
  }
  return {
    loadIndex: () => cached('index', () => source.loadIndex()),
    loadDataset: (name) => cached(`dataset:${name}`, () => source.loadDataset(name)),
  };
}
