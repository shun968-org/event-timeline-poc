import type { TimelineEvent } from '@event-timeline/core';
import type { ViewState } from '../view-state';

/** 絞り込みの条件。並び順は取り込みで確定しているので、並べ替えはしない(基本設計 F-02) */
export type FilterCriteria = Pick<ViewState, 'from' | 'to' | 'sources' | 'types' | 'severities'>;

export interface FilterOptions {
  /** 期間の条件を使わない(ヒストグラムは期間の外も出すため) */
  ignorePeriod?: boolean;
}

/** 条件に合うイベントの位置(events の添字)を、発生順のまま返す */
export function filterEvents(
  events: readonly TimelineEvent[],
  times: readonly number[],
  criteria: FilterCriteria,
  { ignorePeriod = false }: FilterOptions = {},
): number[] {
  const from = !ignorePeriod && criteria.from ? Date.parse(criteria.from) : -Infinity;
  const to = !ignorePeriod && criteria.to ? Date.parse(criteria.to) : Infinity;
  const sources = criteria.sources.length > 0 ? new Set(criteria.sources) : undefined;
  const types = criteria.types.length > 0 ? new Set(criteria.types) : undefined;
  const severities = criteria.severities.length > 0 ? new Set(criteria.severities) : undefined;

  const result: number[] = [];
  events.forEach((event, i) => {
    const time = times[i] ?? NaN;
    if (time < from || time >= to) return;
    if (sources && !sources.has(event.source)) return;
    if (types && !types.has(event.type)) return;
    if (severities && !severities.has(event.severity)) return;
    result.push(i);
  });
  return result;
}

/** 種別ごとの件数(多い順、同数なら名前順) */
export function countTypes(events: readonly TimelineEvent[]): [type: string, count: number][] {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}
