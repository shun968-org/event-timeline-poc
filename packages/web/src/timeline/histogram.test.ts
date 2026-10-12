import { describe, expect, it } from 'vitest';
import { buildHistogram, chooseBucketSize } from './histogram';

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('chooseBucketSize', () => {
  it('区間が上限以下になる最も細かい幅', () => {
    expect(chooseBucketSize(60 * MIN)).toBe(MIN);
    expect(chooseBucketSize(24 * HOUR)).toBe(15 * MIN);
    expect(chooseBucketSize(24 * HOUR, 24)).toBe(HOUR);
    expect(chooseBucketSize(365 * 24 * HOUR)).toBe(24 * HOUR);
  });
});

describe('buildHistogram', () => {
  it('区間・情報源ごとに数え、最大値を求める', () => {
    const from = Date.parse('2026-10-05T00:00:00Z');
    const times = [from, from + MIN, from + 59 * MIN, from + 60 * MIN, from + 61 * MIN];
    const sources = [0, 1, 0, 1, 1];
    const h = buildHistogram(
      [0, 1, 2, 3, 4],
      times,
      (i) => sources[i] ?? -1,
      2,
      from,
      from + 61 * MIN,
    );
    expect(h.bucketMs).toBe(MIN);
    expect(h.start).toBe(from);
    expect(h.counts).toHaveLength(62);
    expect(h.counts[0]).toEqual([1, 0]);
    expect(h.counts[1]).toEqual([0, 1]);
    expect(h.counts[60]).toEqual([0, 1]);
    expect(h.max).toBe(1);
  });

  it('数えるのは indexes に含まれるものだけ', () => {
    const from = Date.parse('2026-10-05T00:00:00Z');
    const h = buildHistogram([1], [from, from], () => 0, 1, from, from + HOUR);
    expect(h.counts[0]).toEqual([1]);
  });
});
