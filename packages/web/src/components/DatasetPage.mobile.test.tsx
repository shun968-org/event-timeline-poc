// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangContext } from '../i18n';
import { COMPACT_QUERY } from '../media';
import { datasetFixture, eventFixture, summaryFixture } from '../test-fixtures';
import { EMPTY_VIEW_STATE, type ViewState } from '../view-state';
import { DatasetPage } from './DatasetPage';

function renderPage(state: Partial<ViewState> = {}) {
  render(
    <LangContext value="ja">
      <DatasetPage
        summary={summaryFixture()}
        dataset={datasetFixture([eventFixture()])}
        state={{ ...EMPTY_VIEW_STATE, ...state }}
        onChange={() => {}}
      />
    </LangContext>,
  );
}

function setViewport(compact: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: compact && query === COMPACT_QUERY,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('スマートフォンの画面幅', () => {
  it('一覧をカード表示にし、絞り込みを折りたたみ、詳細を全画面で開く', () => {
    setViewport(true);
    renderPage({ event: 'app.jsonl:1', severities: ['warn'] });
    expect(screen.getByRole('listbox').className).toContain('event-list-compact');
    expect(screen.getByText('絞り込み (1)').closest('details')?.open).toBe(false);
    const detail = screen.getByRole('dialog', { name: 'イベントの詳細' });
    expect(detail.getAttribute('aria-modal')).toBe('true');
    expect(detail.className).toContain('event-detail-fullscreen');
  });

  it('広い画面では、絞り込みを常に出し、詳細はサイドパネル', () => {
    setViewport(false);
    renderPage({ event: 'app.jsonl:1' });
    expect(screen.getByRole('listbox').className).not.toContain('event-list-compact');
    expect(screen.queryByText('絞り込み')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'イベントの詳細' })).toBeTruthy();
  });
});
