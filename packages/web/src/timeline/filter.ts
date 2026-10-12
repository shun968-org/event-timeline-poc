import type { IdKind, TimelineEvent } from '@event-timeline/core';
import type { ViewState } from '../view-state';

/** 絞り込みの条件。並び順は取り込みで確定しているので、並べ替えはしない(基本設計 F-02) */
export type FilterCriteria = Pick<
  ViewState,
  'from' | 'to' | 'sources' | 'types' | 'severities' | 'q' | 'idKind' | 'idValue'
>;

/** 絞り込みのために、データセットの読み込み時に一度だけ作るもの */
export interface PreparedEvents {
  events: readonly TimelineEvent[];
  /** 発生時刻(UTC のミリ秒) */
  times: readonly number[];
  /** キーワード検索用に小文字にしたメッセージ */
  messages: readonly string[];
  /** 関連 ID の索引(`idKey` → events の添字) */
  ids: ReadonlyMap<string, readonly number[]>;
}

/** 関連 ID の索引のキー。大文字小文字と前後の空白は区別しない */
export function idKey(kind: IdKind, value: string): string {
  return `${kind}:${value.trim().toLowerCase()}`;
}

export function prepareEvents(events: readonly TimelineEvent[]): PreparedEvents {
  const ids = new Map<string, number[]>();
  events.forEach((event, i) => {
    for (const [kind, values] of Object.entries(event.ids) as [IdKind, string[]][]) {
      for (const value of values) {
        const key = idKey(kind, value);
        const list = ids.get(key);
        if (list) list.push(i);
        else ids.set(key, [i]);
      }
    }
  });
  return {
    events,
    times: events.map((e) => Date.parse(e.t)),
    messages: events.map((e) => e.message.toLowerCase()),
    ids,
  };
}

export interface FilterOptions {
  /** 期間の条件を使わない(ヒストグラムは期間の外も出すため) */
  ignorePeriod?: boolean;
}

/** 条件に合うイベントの位置(events の添字)を、発生順のまま返す */
export function filterEvents(
  prepared: PreparedEvents,
  criteria: FilterCriteria,
  { ignorePeriod = false }: FilterOptions = {},
): number[] {
  const { events, times, messages } = prepared;
  const from = !ignorePeriod && criteria.from ? Date.parse(criteria.from) : -Infinity;
  const to = !ignorePeriod && criteria.to ? Date.parse(criteria.to) : Infinity;
  const sources = criteria.sources.length > 0 ? new Set(criteria.sources) : undefined;
  const types = criteria.types.length > 0 ? new Set(criteria.types) : undefined;
  const severities = criteria.severities.length > 0 ? new Set(criteria.severities) : undefined;
  const keyword = criteria.q?.toLowerCase();

  // 関連 ID があれば、索引で引いたイベントだけを調べる(索引の添字は発生順)
  const candidates =
    criteria.idKind && criteria.idValue
      ? (prepared.ids.get(idKey(criteria.idKind, criteria.idValue)) ?? [])
      : undefined;

  const result: number[] = [];
  const check = (i: number) => {
    const event = events[i];
    const time = times[i] ?? NaN;
    if (!event || time < from || time >= to) return;
    if (sources && !sources.has(event.source)) return;
    if (types && !types.has(event.type)) return;
    if (severities && !severities.has(event.severity)) return;
    if (keyword && !messages[i]?.includes(keyword)) return;
    result.push(i);
  };
  if (candidates) candidates.forEach(check);
  else for (let i = 0; i < events.length; i++) check(i);
  return result;
}

/** 種別ごとの件数(多い順、同数なら名前順) */
export function countTypes(events: readonly TimelineEvent[]): [type: string, count: number][] {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}
