import { LANGS, type Lang } from '@event-timeline/core';
import { createContext, useContext } from 'react';
import en from './en.json';
import ja from './ja.json';

export type { Lang };

/** 画面の文言。日本語を基準にキーを決め、英語も同じキーで引く(キーの欠けは i18n.test.ts が検出する) */
export const messages = { ja, en } satisfies Record<Lang, Record<string, string>>;

export type MessageKey = keyof typeof ja;
export type MessageParams = Record<string, string | number>;

/** 文言を引く。`{name}` は params の値で置き換える。辞書に無い文言は日本語で出す */
export function translate(lang: Lang, key: MessageKey, params?: MessageParams): string {
  const text = (messages[lang] as Record<string, string>)[key] ?? messages.ja[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? value.toLocaleString(lang) : value;
  });
}

/**
 * 表示する言語を決める: URL の `lang=` → ブラウザに保存した言語 → ブラウザの言語設定の順。
 * ブラウザの言語設定は、日本語以外なら英語にする。
 */
export function resolveLang(
  fromUrl: Lang | undefined,
  stored: string | undefined,
  browserLanguages: readonly string[],
): Lang {
  if (fromUrl) return fromUrl;
  const saved = LANGS.find((lang) => lang === stored);
  if (saved) return saved;
  return browserLanguages[0]?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export const LangContext = createContext<Lang>('ja');

/** 今の言語と、その言語で文言を引く関数 */
export function useT() {
  const lang = useContext(LangContext);
  const t = (key: MessageKey, params?: MessageParams) => translate(lang, key, params);
  return { lang, t };
}
