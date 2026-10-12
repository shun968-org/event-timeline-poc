import type { DatasetFile, DatasetSummary } from '@event-timeline/core';
import { useT } from '../i18n';

interface Props {
  summary: DatasetSummary;
  dataset: DatasetFile;
}

/** データセットの画面。タイムラインは #18 で作る */
export function DatasetPage({ summary, dataset }: Props) {
  const { lang, t } = useT();
  return (
    <main className="dataset">
      <h2>{summary.scenario.title[lang]}</h2>
      <p>{t('top.eventCount', { count: dataset.events.length })}</p>
    </main>
  );
}
