// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createCachedDataSource, type DataSource } from './data/data-source';
import { DataSourceContext } from './data/context';
import { datasetFixture, eventFixture, memoryDataSource, summaryFixture } from './test-fixtures';

const index = { datasets: [summaryFixture()] };
const dataset = datasetFixture([eventFixture(), eventFixture({ id: 'app.jsonl:2', line: 2 })]);

/** 読み込み(Suspense)が終わるまで待って描画する */
async function renderApp(source: DataSource = memoryDataSource(index, [dataset])) {
  await act(async () => {
    render(
      <DataSourceContext value={createCachedDataSource(source)}>
        <App />
      </DataSourceContext>,
    );
  });
}

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});
afterEach(cleanup);

describe('App', () => {
  it('サーバ側の描画でも、題名と架空のデータであることを出す', () => {
    const html = renderToString(<App />);
    expect(html).toMatch(/Event Timeline PoC|イベントタイムライン PoC/);
    expect(html).toMatch(/fictional and synthetic|架空の合成データ/);
  });

  it('シナリオを選ぶとデータセットの画面に移り、URL に条件が入る。戻るとトップに戻る', async () => {
    window.history.replaceState(null, '', '/?lang=ja');
    await renderApp();
    expect(screen.getByText(/架空の合成データ/)).toBeTruthy();

    await click(screen.getByText('ログインできない'));
    expect(await screen.findByRole('heading', { name: 'ログインできない' })).toBeTruthy();
    expect(window.location.search).toBe('?dataset=s5-login-locked&lang=ja');

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    });
    expect(await screen.findByText('シナリオ')).toBeTruthy();
  });

  it('言語を切り替えると、文言・URL・保存した言語が変わる', async () => {
    window.history.replaceState(null, '', '/?lang=ja');
    await renderApp();
    await screen.findByText('ログインできない');

    await click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('Cannot log in')).toBeTruthy();
    expect(window.location.search).toBe('?lang=en');
    expect(window.localStorage.getItem('event-timeline:lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('URL に言語が無ければ、保存した言語を使う', async () => {
    window.localStorage.setItem('event-timeline:lang', 'en');
    await renderApp();
    expect(await screen.findByText('Cannot log in')).toBeTruthy();
  });

  it('一覧に無いデータセットは、見つからないと表示する', async () => {
    window.history.replaceState(null, '', '/?dataset=unknown&lang=ja');
    await renderApp();
    expect((await screen.findByRole('alert')).textContent).toContain('「unknown」が見つかりません');
  });

  it('読み込みに失敗したら、エラーを表示する', async () => {
    window.history.replaceState(null, '', '/?lang=ja');
    await renderApp({
      loadIndex: () => Promise.reject(new Error('/data/index.json を読み込めません: HTTP 500')),
      loadDataset: () => Promise.reject(new Error('unused')),
    });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('データを読み込めませんでした');
    expect(alert.textContent).toContain('HTTP 500');
  });
});
