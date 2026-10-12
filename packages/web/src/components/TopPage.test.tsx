import type { IndexFile } from '@event-timeline/core';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LangContext } from '../i18n';
import { TopPage } from './TopPage';

const index: IndexFile = {
  datasets: [
    {
      name: 's5-login-locked',
      eventCount: 9513,
      from: '2026-10-04T15:00:00.000Z',
      to: '2026-10-05T15:00:00.000Z',
      sources: [{ name: 'app', label: { ja: 'アプリ', en: 'Application' } }],
      scenario: {
        kind: 'inquiry',
        title: { ja: 'ログインできない', en: 'Cannot log in' },
        summary: { ja: '紹介', en: 'Summary' },
        howToStart: { ja: '始め方', en: 'How to start' },
        answer: { rootCause: { ja: '原因', en: 'Cause' }, sequence: ['app.jsonl:1'] },
      },
    },
  ],
};

describe('TopPage', () => {
  it('選んだ言語でシナリオの題名・種類・件数を出す', () => {
    const html = (lang: 'ja' | 'en') =>
      renderToString(
        <LangContext value={lang}>
          <TopPage index={index} onSelect={() => {}} />
        </LangContext>,
      );
    expect(html('ja')).toContain('ログインできない');
    expect(html('ja')).toContain('問い合わせ');
    expect(html('ja')).toContain('9,513 件');
    expect(html('en')).toContain('Cannot log in');
    expect(html('en')).toContain('9,513 events');
    expect(html('en')).toContain('?dataset=s5-login-locked');
  });
});
