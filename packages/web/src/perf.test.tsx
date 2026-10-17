// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createCachedDataSource } from './data/data-source';
import { DataSourceContext } from './data/context';
import {
  clearMeasurements,
  finishInteraction,
  measure,
  startInteraction,
  useMeasurements,
} from './perf';
import { datasetFixture, eventFixture, memoryDataSource, summaryFixture } from './test-fixtures';

function Measurements() {
  const measurements = useMeasurements();
  return <p>{measurements.map((m) => m.name).join(',')}</p>;
}

beforeEach(() => {
  clearMeasurements();
  window.history.replaceState(null, '', '/');
});
afterEach(cleanup);

describe('処理時間の計測', () => {
  it('同期の処理の時間を、新しいものから記録する', async () => {
    render(<Measurements />);
    await act(async () => {
      expect(measure('index', () => 42)).toBe(42);
      measure('filter', () => undefined);
    });
    expect(screen.getByText('filter,index')).toBeTruthy();
  });

  it('操作の始まりから、次の描画の後までを記録する', async () => {
    render(<Measurements />);
    startInteraction();
    finishInteraction('update');
    await waitFor(() => expect(screen.getByText('update')).toBeTruthy());
  });

  it('URL の末尾が #perf のときだけ、処理時間を画面に出す', async () => {
    const index = { datasets: [summaryFixture()] };
    const source = memoryDataSource(index, [datasetFixture([eventFixture()])]);
    const renderApp = () =>
      act(async () => {
        render(
          <DataSourceContext value={createCachedDataSource(source)}>
            <App />
          </DataSourceContext>,
        );
      });

    window.history.replaceState(null, '', '/?dataset=s5-login-locked&lang=ja');
    await renderApp();
    expect(screen.queryByRole('complementary', { name: '処理時間(ミリ秒)' })).toBeNull();
    cleanup();

    window.history.replaceState(null, '', '/?dataset=s5-login-locked&lang=ja#perf');
    await renderApp();
    const panel = screen.getByRole('complementary', { name: '処理時間(ミリ秒)' });
    await waitFor(() => expect(panel.textContent).toContain('開いてから表示まで'));
    expect(panel.textContent).toContain('索引の作成');
    expect(panel.textContent).toContain('絞り込みの計算');
  });
});
