import type { DatasetSummary, Lang } from '@event-timeline/core';
import { Suspense, use, useEffect } from 'react';
import { DatasetPage } from './components/DatasetPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { PerfPanel } from './components/PerfPanel';
import { TopPage } from './components/TopPage';
import { useDataSource } from './data/context';
import { LangContext, resolveLang, useT } from './i18n';
import { useViewState, type NavigateOptions } from './navigation';
import { isPerfPanelEnabled } from './perf';
import { loadSetting, saveSetting } from './storage';
import { EMPTY_VIEW_STATE, type ViewState } from './view-state';

const LANG_KEY = 'event-timeline:lang';

function browserLanguages(): readonly string[] {
  return typeof navigator === 'undefined' ? [] : navigator.languages;
}

export function App() {
  const [state, navigate] = useViewState();
  const lang = resolveLang(state.lang, loadSetting(LANG_KEY), browserLanguages());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const changeLang = (next: Lang) => {
    saveSetting(LANG_KEY, next);
    navigate({ ...state, lang: next }, { replace: true });
  };

  return (
    <LangContext value={lang}>
      <Header onHome={() => navigate({ ...EMPTY_VIEW_STATE, lang })} onChangeLang={changeLang} />
      <ErrorBoundary key={state.dataset ?? ''} fallback={(error) => <LoadError error={error} />}>
        <Suspense fallback={<Loading />}>
          {state.dataset ? (
            <DatasetLoader name={state.dataset} state={state} onChange={navigate} />
          ) : (
            <IndexLoader onSelect={(dataset) => navigate({ ...EMPTY_VIEW_STATE, dataset, lang })} />
          )}
        </Suspense>
      </ErrorBoundary>
      {isPerfPanelEnabled() && <PerfPanel />}
    </LangContext>
  );
}

function IndexLoader({ onSelect }: { onSelect: (dataset: string) => void }) {
  const index = use(useDataSource().loadIndex());
  return <TopPage index={index} onSelect={onSelect} />;
}

interface DatasetProps {
  state: ViewState;
  onChange: (next: ViewState, options?: NavigateOptions) => void;
}

function DatasetLoader({ name, ...props }: DatasetProps & { name: string }) {
  const { t } = useT();
  const source = useDataSource();
  const index = use(source.loadIndex());
  const summary = index.datasets.find((d) => d.name === name);
  if (!summary) {
    return (
      <main className="message">
        <p role="alert">{t('error.datasetNotFound', { name })}</p>
        <a href="?">{t('error.backToTop')}</a>
      </main>
    );
  }
  return <DatasetContent summary={summary} {...props} />;
}

function DatasetContent({ summary, ...props }: DatasetProps & { summary: DatasetSummary }) {
  const dataset = use(useDataSource().loadDataset(summary.name));
  return <DatasetPage summary={summary} dataset={dataset} {...props} />;
}

function Loading() {
  const { t } = useT();
  return (
    <main className="message">
      <p aria-busy="true">{t('status.loading')}</p>
    </main>
  );
}

function LoadError({ error }: { error: unknown }) {
  const { t } = useT();
  return (
    <main className="message">
      <div className="error-banner" role="alert">
        <p>{t('error.load')}</p>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
      <a href="?">{t('error.backToTop')}</a>
    </main>
  );
}
