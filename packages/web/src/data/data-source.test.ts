import type { DatasetFile, IndexFile } from '@event-timeline/core';
import { describe, expect, it, vi } from 'vitest';
import { createCachedDataSource, createStaticDataSource, DataLoadError } from './data-source';

const index: IndexFile = { datasets: [] };
const dataset: DatasetFile = {
  dataset: 's1',
  generatedAt: '2026-10-12T00:00:00.000Z',
  sources: [{ name: 'app', label: { ja: 'アプリ', en: 'App' } }],
  events: [],
};

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe('createStaticDataSource', () => {
  it('baseUrl の下の index.json とデータセットの JSON を読む', async () => {
    const fetchFn = respond(index);
    const source = createStaticDataSource('/data/', fetchFn);
    await expect(source.loadIndex()).resolves.toEqual(index);
    expect(fetchFn).toHaveBeenCalledWith('/data/index.json');

    const datasetFetch = respond(dataset);
    await createStaticDataSource('/data/', datasetFetch).loadDataset('s1');
    expect(datasetFetch).toHaveBeenCalledWith('/data/s1.json');
  });

  it('HTTP のエラーは DataLoadError にする', async () => {
    const source = createStaticDataSource('/data/', respond({}, 404));
    await expect(source.loadIndex()).rejects.toThrow(DataLoadError);
    await expect(source.loadIndex()).rejects.toThrow('/data/index.json を読み込めません');
  });

  it('形式が違えば、どこが違うかを出す', async () => {
    const source = createStaticDataSource('/data/', respond({ datasets: [{ name: 1 }] }));
    await expect(source.loadIndex()).rejects.toThrow(/形式が正しくありません[\s\S]*datasets/);
  });
});

describe('createCachedDataSource', () => {
  it('同じ読み込みには同じ Promise を返し、失敗したものは読み直す', async () => {
    const loadIndex = vi
      .fn<() => Promise<IndexFile>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(index);
    const source = createCachedDataSource({ loadIndex, loadDataset: vi.fn() });

    await expect(source.loadIndex()).rejects.toThrow('offline');
    const first = source.loadIndex();
    expect(source.loadIndex()).toBe(first);
    await expect(first).resolves.toEqual(index);
    expect(loadIndex).toHaveBeenCalledTimes(2);
  });
});
