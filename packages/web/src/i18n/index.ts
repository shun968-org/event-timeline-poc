import en from './en.json';
import ja from './ja.json';

/** 画面の文言。日本語を基準にキーを決め、英語も同じキーで引く(キーの欠けは i18n.test.ts が検出する) */
export const messages = { ja, en } satisfies Record<string, Record<string, string>>;

export type Lang = keyof typeof messages;
export type MessageKey = keyof typeof ja;

export function translate(lang: Lang, key: MessageKey): string {
  return (messages[lang] as Record<string, string>)[key] ?? messages.ja[key];
}
