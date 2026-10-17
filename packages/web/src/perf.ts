import { useSyncExternalStore } from 'react';

/**
 * 処理時間の計測(非機能要件「性能」の確認用)。計測は常に行い、URL の末尾に `#perf` を付けたときだけ
 * 画面の隅に出す(スマートフォンでは開発者ツールが使いにくいため)
 */
export type MeasureName = 'fetch' | 'validate' | 'index' | 'filter' | 'open' | 'update';

export interface Measurement {
  name: MeasureName;
  ms: number;
}

const MAX_MEASUREMENTS = 12;
let measurements: readonly Measurement[] = [];
const listeners = new Set<() => void>();
let interactionStart: number | undefined;

export function recordMeasurement(name: MeasureName, ms: number): void {
  measurements = [{ name, ms }, ...measurements].slice(0, MAX_MEASUREMENTS);
  // 描画中に呼ばれることがあるので、表示の更新は描画の後に回す
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
}

/** 同期の処理を測る */
export function measure<T>(name: MeasureName, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordMeasurement(name, performance.now() - start);
  }
}

/** 利用者の操作(画面の条件の変更)の始まりを記録する */
export function startInteraction(): void {
  interactionStart = performance.now();
}

/**
 * 操作の始まりから、結果が画面に描かれるまでを記録する。操作を経ずに開いたとき(URL を直接開いたとき)は
 * ページの読み込みの始まりから測る
 */
export function finishInteraction(name: MeasureName): void {
  const start = interactionStart ?? 0;
  interactionStart = undefined;
  // 描画の確定(次のフレーム)の後で時刻を取る
  requestAnimationFrame(() => {
    setTimeout(() => recordMeasurement(name, performance.now() - start), 0);
  });
}

export function clearMeasurements(): void {
  measurements = [];
  interactionStart = undefined;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMeasurements(): readonly Measurement[] {
  return useSyncExternalStore(
    subscribe,
    () => measurements,
    () => measurements,
  );
}

export function isPerfPanelEnabled(): boolean {
  return typeof window !== 'undefined' && window.location.hash === '#perf';
}
