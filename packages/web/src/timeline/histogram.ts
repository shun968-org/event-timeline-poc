const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** 区間の幅の候補。日本時間の区切り(+9時間)とも揃う幅だけを使う */
const BUCKET_SIZES = [
  MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
];

/** 区間の数が maxBuckets 以下になる、最も細かい幅 */
export function chooseBucketSize(spanMs: number, maxBuckets = 120): number {
  return BUCKET_SIZES.find((size) => spanMs / size <= maxBuckets) ?? 24 * HOUR;
}

export interface Histogram {
  /** 最初の区間の始まり(UTC のミリ秒) */
  start: number;
  bucketMs: number;
  /** counts[区間][情報源の位置] */
  counts: number[][];
  /** 1区間の合計の最大値 */
  max: number;
}

/**
 * 時間帯ごと・情報源ごとの件数を数える。区間は [from, to] を覆うように、区間の幅で区切る
 * (`indexes` は数える events の添字)
 */
export function buildHistogram(
  indexes: readonly number[],
  times: readonly number[],
  sourceOf: (index: number) => number,
  sourceCount: number,
  from: number,
  to: number,
): Histogram {
  const bucketMs = chooseBucketSize(Math.max(to - from, 1));
  const start = Math.floor(from / bucketMs) * bucketMs;
  const bucketCount = Math.max(1, Math.floor((to - start) / bucketMs) + 1);
  const counts = Array.from({ length: bucketCount }, () => new Array<number>(sourceCount).fill(0));
  for (const i of indexes) {
    const bucket = counts[Math.floor(((times[i] ?? start) - start) / bucketMs)];
    const source = sourceOf(i);
    if (bucket && source >= 0) bucket[source] = (bucket[source] ?? 0) + 1;
  }
  const max = Math.max(1, ...counts.map((c) => c.reduce((sum, n) => sum + n, 0)));
  return { start, bucketMs, counts, max };
}
