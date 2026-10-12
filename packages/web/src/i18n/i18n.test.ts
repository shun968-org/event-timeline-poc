import { describe, expect, it } from 'vitest';
import { messages } from '.';

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
