/** 重要度。情報源ごとの値は、定義ファイルの対応表でこの語彙に変換する */
export const SEVERITIES = ['debug', 'info', 'warn', 'error', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** 関連 ID の種類(注文 ID・ユーザー ID・トレース ID) */
export const ID_KINDS = ['order', 'user', 'trace'] as const;
export type IdKind = (typeof ID_KINDS)[number];

/** 画面の言語 */
export const LANGS = ['ja', 'en'] as const;
export type Lang = (typeof LANGS)[number];
