import { describe, expect, it } from 'vitest';
import { messages, resolveLang, translate } from '.';

describe('画面の文言', () => {
  const langs = Object.keys(messages) as (keyof typeof messages)[];
  const allKeys = [...new Set(langs.flatMap((lang) => Object.keys(messages[lang])))].sort();

  it.each(langs)('%s に全てのキーがある', (lang) => {
    const missing = allKeys.filter((key) => !(key in messages[lang]));
    expect(missing, `${lang}.json に無いキー`).toEqual([]);
  });

  it.each(langs)('%s に空の文言が無い', (lang) => {
    const empty = Object.entries(messages[lang])
      .filter(([, text]) => text.trim() === '')
      .map(([key]) => key);
    expect(empty, `${lang}.json の空の文言`).toEqual([]);
  });
});

describe('translate', () => {
  it('{name} を置き換え、数は言語に合わせて区切る', () => {
    expect(translate('ja', 'top.eventCount', { count: 9513 })).toBe('9,513 件');
    expect(translate('en', 'top.eventCount', { count: 9513 })).toBe('9,513 events');
  });
});

describe('resolveLang', () => {
  it('URL の指定を最優先する', () => {
    expect(resolveLang('en', 'ja', ['ja-JP'])).toBe('en');
  });

  it('次にブラウザに保存した言語を使う', () => {
    expect(resolveLang(undefined, 'ja', ['en-US'])).toBe('ja');
    expect(resolveLang(undefined, 'fr', ['ja'])).toBe('ja');
  });

  it('ブラウザの言語設定が日本語以外なら英語', () => {
    expect(resolveLang(undefined, undefined, ['ja-JP', 'en'])).toBe('ja');
    expect(resolveLang(undefined, undefined, ['fr-FR', 'ja'])).toBe('en');
    expect(resolveLang(undefined, undefined, [])).toBe('en');
  });
});
