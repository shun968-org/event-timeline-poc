// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Header } from './components/Header';
import { TopPage } from './components/TopPage';
import { FEEDBACK_URLS } from './feedback';
import { AnswerPanel } from './guide/AnswerPanel';
import { LangContext } from './i18n';
import { summaryFixture } from './test-fixtures';

afterEach(cleanup);

function expectExternal(link: HTMLElement, href: string) {
  expect(link.getAttribute('href')).toBe(href);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
}

describe('感想・要望へのリンク', () => {
  it('ヘッダーから感想(General)に移れる', () => {
    render(
      <LangContext value="ja">
        <Header onHome={() => {}} onChangeLang={() => {}} />
      </LangContext>,
    );
    expectExternal(screen.getByRole('link', { name: '感想を送る' }), FEEDBACK_URLS.general);
  });

  it('トップ画面から感想・改善要望・投票に移れる', () => {
    render(
      <LangContext value="en">
        <TopPage index={{ datasets: [summaryFixture()] }} onSelect={() => {}} />
      </LangContext>,
    );
    const feedback = within(screen.getByRole('region', { name: 'Feedback' }));
    expectExternal(feedback.getByRole('link', { name: 'Share feedback' }), FEEDBACK_URLS.general);
    expectExternal(
      feedback.getByRole('link', { name: 'Suggest an improvement' }),
      FEEDBACK_URLS.ideas,
    );
    expectExternal(feedback.getByRole('link', { name: /Vote/ }), FEEDBACK_URLS.polls);
  });

  it('答え合わせのパネルを開くと、感想へのリンクを出す', () => {
    render(
      <LangContext value="ja">
        <AnswerPanel
          scenario={summaryFixture().scenario}
          eventById={new Map()}
          sources={[]}
          tz="jst"
          onJump={() => {}}
        />
      </LangContext>,
    );
    expect(screen.queryByRole('region', { name: '感想・要望' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));
    const feedback = within(screen.getByRole('region', { name: '感想・要望' }));
    expectExternal(feedback.getByRole('link', { name: /投票/ }), FEEDBACK_URLS.polls);
  });
});
