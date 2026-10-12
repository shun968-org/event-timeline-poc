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
    file: 'audit.csv',
    line: 2,
  }),
  eventFixture({ id: 'app.jsonl:2', t: '2026-10-05T14:00:00.000Z', message: 'last', line: 2 }),
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

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');

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
});
