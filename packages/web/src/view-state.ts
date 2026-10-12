import {
  ID_KINDS,
  LANGS,
  SEVERITIES,
  type IdKind,
  type Lang,
  type Severity,
} from '@event-timeline/core';

/** 時刻の表示(日本時間 / UTC) */
export const TIME_ZONES = ['jst', 'utc'] as const;
export type TimeZoneMode = (typeof TIME_ZONES)[number];

/**
 * 画面の条件。URL のクエリ文字列と1対1に対応する(基本設計 F-06)。
 * 値が無いものは「絞り込まない」「既定値を使う」を表す。
 */
export interface ViewState {
  dataset?: string | undefined;
  lang?: Lang | undefined;
  tz?: TimeZoneMode | undefined;
  /** 期間(UTC の ISO 8601)。from 以上 to 未満 */
  from?: string | undefined;
  to?: string | undefined;
  sources: string[];
  types: string[];
  severities: Severity[];
  /** メッセージのキーワード */
  q?: string | undefined;
  idKind?: IdKind | undefined;
  idValue?: string | undefined;
  /** 選択中のイベント ID */
  event?: string | undefined;
}

export const EMPTY_VIEW_STATE: ViewState = { sources: [], types: [], severities: [] };

const DATASET_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SOURCE_PATTERN = /^[a-z][a-z0-9-]*$/;

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return values.find((v) => v === value);
}

function nonEmpty(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isoTime(value: string | null): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function list(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').filter((v) => v !== ''))];
}

/** クエリ文字列を画面の条件にする。解釈できない値は無視し、その条件だけ既定値にする */
export function parseViewState(search: string): ViewState {
  const params = new URLSearchParams(search);
  const dataset = params.get('dataset');
  const idKind = oneOf(ID_KINDS, params.get('idKind'));
  const idValue = idKind ? nonEmpty(params.get('idValue')) : undefined;
  let from = isoTime(params.get('from'));
  let to = isoTime(params.get('to'));
  if (from && to && from >= to) {
    from = undefined;
    to = undefined;
  }
  return {
    dataset: dataset && DATASET_PATTERN.test(dataset) ? dataset : undefined,
    lang: oneOf(LANGS, params.get('lang')),
    tz: oneOf(TIME_ZONES, params.get('tz')),
    from,
    to,
    sources: list(params.get('sources')).filter((s) => SOURCE_PATTERN.test(s)),
    types: list(params.get('types')),
    severities: list(params.get('severities')).flatMap((s) => oneOf(SEVERITIES, s) ?? []),
    q: nonEmpty(params.get('q')),
    idKind: idValue ? idKind : undefined,
    idValue,
    event: nonEmpty(params.get('event')),
  };
}

/** 画面の条件をクエリ文字列(`?` から。条件が無ければ空文字)にする。キーの順は固定 */
export function serializeViewState(state: ViewState): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | undefined) => {
    if (value) params.set(key, value);
  };
  set('dataset', state.dataset);
  set('from', state.from);
  set('to', state.to);
  set('sources', state.sources.join(','));
  set('types', state.types.join(','));
  set('severities', state.severities.join(','));
  set('q', state.q);
  if (state.idKind && state.idValue) {
    set('idKind', state.idKind);
    set('idValue', state.idValue);
  }
  set('event', state.event);
  set('tz', state.tz);
  set('lang', state.lang);
  const query = params.toString();
  return query ? `?${query}` : '';
}
