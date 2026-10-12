// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetPage } from '../components/DatasetPage';
import { LangContext } from '../i18n';
import { datasetFixture, eventFixture, summaryFixture } from '../test-fixtures';
import { EMPTY_VIEW_STATE, type ViewState } from '../view-state';

const events = [
  eventFixture({ id: 'app.jsonl:1', t: '2026-10-05T01:00:00.000Z', message: 'Login failed (5/5)' }),
  eventFixture({
    id: 'audit.csv:2',
    t: '2026-10-05T01:01:00.000Z',
    source: 'audit',
    type: 'account_locked',
    message: 'Account locked',
    file: 'audit.csv',
    line: 2,
  }),
];

function renderPage(state: Partial<ViewState> = {}) {
  const onChange = vi.fn<(next: ViewState) => void>();
  render(
    <LangContext value="ja">
      <DatasetPage
        summary={summaryFixture()}
        dataset={datasetFixture(events)}
        state={{ ...EMPTY_VIEW_STATE, dataset: 's5-login-locked', ...state }}
        onChange={onChange}
      />
    </LangContext>,
  );
  return onChange;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('案内', () => {
  it('調査の始め方を出し、閉じられる', () => {
    renderPage();
    const banner = screen.getByRole('region', { name: '調査の始め方' });
    expect(banner.textContent).toContain('ユーザー ID で絞り込もう');
    fireEvent.click(within(banner).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('region', { name: '調査の始め方' })).toBeNull();
  });

  it('操作のヒントは初回だけ出す', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'わかった' }));
    expect(screen.queryByRole('region', { name: '使い方のヒント' })).toBeNull();
    cleanup();

    renderPage();
    expect(screen.queryByRole('region', { name: '使い方のヒント' })).toBeNull();
  });
});

describe('答え合わせ', () => {
  it('「答えを見る」を押すまで正解を出さない', () => {
    renderPage();
    expect(screen.queryByText('パスワード誤りの連続')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));
    expect(screen.getByText('パスワード誤りの連続')).toBeTruthy();
    const steps = within(screen.getByRole('list', { name: /原因から影響までの順序/ }));
    expect(steps.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Login failed (5/5)'),
      expect.stringContaining('Account locked'),
    ]);
  });

  it('順序の項目を押すとそのイベントに移り、隠れていれば絞り込みを外す', () => {
    const onChange = renderPage({ sources: ['audit'], tz: 'utc', lang: 'ja' });
    fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));

    fireEvent.click(screen.getByRole('button', { name: /Account locked/ }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sources: ['audit'], event: 'audit.csv:2' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Login failed/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_VIEW_STATE,
      dataset: 's5-login-locked',
      lang: 'ja',
      tz: 'utc',
      event: 'app.jsonl:1',
    });
  });
});
