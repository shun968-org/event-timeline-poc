// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangContext } from '../i18n';
import { datasetFixture, eventFixture, summaryFixture } from '../test-fixtures';
import { EMPTY_VIEW_STATE, type ViewState } from '../view-state';
import { DatasetPage } from './DatasetPage';

const events = [
  eventFixture({ id: 'app.jsonl:1', t: '2026-10-04T15:00:00.000Z', message: 'first' }),
  eventFixture({
    id: 'audit.csv:2',
    t: '2026-10-04T16:00:00.000Z',
    source: 'audit',
    type: 'account_locked',
    severity: 'error',
    message: 'Account locked',
    ids: { user: ['U-77102'] },
    raw: { at: '2026-10-05T01:00:00+09:00', action: 'account_locked', detail: { attempts: 5 } },
    originalTime: '2026-10-05T01:00:00+09:00',
    file: 'audit.csv',
    line: 2,
  }),
  eventFixture({
    id: 'app.jsonl:2',
    t: '2026-10-05T14:00:00.000Z',
    message: 'last',
    line: 2,
    ids: { trace: ['7f3a'] },
  }),
];

function renderPage(state: Partial<ViewState> = {}, lang: 'ja' | 'en' = 'ja') {
  const onChange = vi.fn<(next: ViewState) => void>();
  render(
    <LangContext value={lang}>
      <DatasetPage
        summary={summaryFixture()}
        dataset={datasetFixture(events)}
        state={{ ...EMPTY_VIEW_STATE, ...state }}
        onChange={onChange}
      />
    </LangContext>,
  );
  return onChange;
}

const rows = () => within(screen.getByRole('listbox')).getAllByRole('option');

// jsdom は大きさを計算しないので、一覧の表示領域の大きさを与える(仮想スクロールが行を描くように)
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DatasetPage', () => {
  it('全情報源のイベントを発生順に並べ、時刻は日本時間で出す', () => {
    renderPage();
    expect(screen.getByText('3 / 3 件')).toBeTruthy();
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('10-05 00:00:00.000'),
      expect.stringContaining('Account locked'),
      expect.stringContaining('last'),
    ]);
    expect(rows()[1]?.className).toContain('event-row-high');
  });

  it('英語表示の既定は UTC、切り替えも URL の条件に入れる', () => {
    const onChange = renderPage({}, 'en');
    expect(rows()[0]?.textContent).toContain('10-04 15:00:00.000');
    fireEvent.click(screen.getByRole('button', { name: 'JST' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tz: 'jst' }));
  });

  it('条件で絞り込み、該当が無ければその旨を出す', () => {
    renderPage({ sources: ['audit'] });
    expect(screen.getByText('1 / 3 件')).toBeTruthy();
    expect(rows()).toHaveLength(1);
    cleanup();

    renderPage({ severities: ['critical'] });
    expect(screen.getByText('条件に合うイベントはありません。')).toBeTruthy();
  });

  it('情報源・重要度の選択と、絞り込みの解除', () => {
    const onChange = renderPage({ severities: ['error'], from: '2026-10-04T16:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: /操作・監査|監査/ }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sources: ['audit'] }));

    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ severities: [] }));

    expect(screen.getByText(/期間: 2026-10-05 01:00 〜 …/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '期間を解除' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: undefined, to: undefined, severities: ['error'] }),
    );
  });

  it('ヒストグラムをドラッグすると、その区間を期間にする', () => {
    const onChange = renderPage();
    const chart = screen.getByRole('img', { name: /時間帯ごと/ });
    chart.getBoundingClientRect = () => ({ left: 0, width: 970 }) as DOMRect;
    chart.setPointerCapture = () => {};
    // 24時間(両端を含む)を15分ごとの97区間に分けるので、1区間は 10px。区間 1〜4 を選ぶ
    fireEvent.pointerDown(chart, { clientX: 45, pointerId: 1 });
    fireEvent.pointerMove(chart, { clientX: 15, pointerId: 1 });
    fireEvent.pointerUp(chart, { clientX: 15, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: '2026-10-04T15:15:00.000Z',
        to: '2026-10-04T16:15:00.000Z',
      }),
    );
  });

  it('キーワードで絞り込み、一致が無ければ入力した値を出す', () => {
    const onChange = renderPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'メッセージのキーワード' }), {
      target: { value: 'locked ' },
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'locked' }), {
      replace: true,
    });
    cleanup();

    renderPage({ q: 'LOCKED' });
    expect(rows()).toHaveLength(1);
    cleanup();

    renderPage({ q: 'nothing' });
    expect(screen.getByText('「nothing」を含むイベントはありません。')).toBeTruthy();
  });

  it('関連 ID を入力して絞り込み、絞り込み中の表示から1操作で解除する', () => {
    const onChange = renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '関連 ID の種類' }), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '関連 ID の値' }), {
      target: { value: ' U-77102 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '絞り込む' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ idKind: 'user', idValue: 'U-77102' }),
    );
    cleanup();

    // 既定のイベント(eventFixture)も U-77102 を持つ。大文字小文字は区別しない
    const onChange2 = renderPage({ idKind: 'user', idValue: 'u-77102' });
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toContain('ユーザー ID = u-77102 で絞り込み中');
    fireEvent.click(screen.getByRole('button', { name: '解除' }));
    expect(onChange2).toHaveBeenLastCalledWith(
      expect.objectContaining({ idKind: undefined, idValue: undefined }),
    );
    cleanup();

    renderPage({ idKind: 'order', idValue: 'O-1' });
    expect(screen.getByText('注文 ID「O-1」に一致するイベントはありません。')).toBeTruthy();
  });

  it('イベントを選ぶと詳細に共通項目と元データを出し、その関連 ID で絞り込める', () => {
    const onChange = renderPage();
    fireEvent.click(rows()[1] as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ event: 'audit.csv:2' }));
    cleanup();

    const onChange2 = renderPage({ event: 'audit.csv:2' });
    expect(rows()[1]?.getAttribute('aria-selected')).toBe('true');
    const detail = screen.getByRole('complementary', { name: 'イベントの詳細' });
    const text = detail.textContent ?? '';
    expect(text).toContain('2026-10-05 01:00:00.000 JST');
    expect(text).toContain('2026-10-04 16:00:00.000 UTC');
    expect(text).toContain('監査');
    expect(text).toContain('account_locked');
    expect(text).toContain('audit.csv:2');
    expect(text).toContain('2026-10-05T01:00:00+09:00');
    expect(text).toContain('{"attempts":5}');

    fireEvent.click(within(detail).getByRole('button', { name: 'この ID で絞り込む' }));
    expect(onChange2).toHaveBeenLastCalledWith(
      expect.objectContaining({ idKind: 'user', idValue: 'U-77102', event: 'audit.csv:2' }),
    );
    fireEvent.click(within(detail).getByRole('button', { name: '詳細を閉じる' }));
    expect(onChange2).toHaveBeenLastCalledWith(expect.objectContaining({ event: undefined }));
  });

  it('URL のイベント ID が見つからなければ、詳細は出さない', () => {
    renderPage({ event: 'missing.csv:1' });
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
