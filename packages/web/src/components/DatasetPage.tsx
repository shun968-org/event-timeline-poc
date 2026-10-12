import type { DatasetFile, DatasetSummary } from '@event-timeline/core';
import { useMemo } from 'react';
import { useT } from '../i18n';
import type { NavigateOptions } from '../navigation';
import { EventList } from '../timeline/EventList';
import { countTypes, filterEvents } from '../timeline/filter';
import { FilterBar } from '../timeline/FilterBar';
import { buildHistogram } from '../timeline/histogram';
import { HistogramChart } from '../timeline/HistogramChart';
import type { ViewState } from '../view-state';

interface Props {
  summary: DatasetSummary;
  dataset: DatasetFile;
  state: ViewState;
  onChange: (next: ViewState, options?: NavigateOptions) => void;
}

/** データセットのタイムライン画面(基本設計 F-02) */
export function DatasetPage({ summary, dataset, state, onChange }: Props) {
  const { lang, t } = useT();
  const tz = state.tz ?? (lang === 'en' ? 'utc' : 'jst');
  const { events } = dataset;

  // データセットごとに一度だけ求めるもの
  const prepared = useMemo(() => {
    const times = events.map((e) => Date.parse(e.t));
    const sourcePosition = new Map(dataset.sources.map((s, i) => [s.name, i]));
    const sourceIndex = events.map((e) => sourcePosition.get(e.source) ?? -1);
    return {
      times,
      sourcePosition,
      sourceIndex,
      types: countTypes(events),
      from: Date.parse(summary.from),
      to: Date.parse(summary.to),
    };
  }, [events, dataset.sources, summary.from, summary.to]);

  // state は URL が変わったときだけ作り直されるので、条件の配列をそのまま依存に使える
  const { from, to, sources, types, severities } = state;
  const { indexes, histogram } = useMemo(() => {
    const { times, sourceIndex } = prepared;
    const criteria = { from, to, sources, types, severities };
    return {
      indexes: filterEvents(events, times, criteria),
      histogram: buildHistogram(
        filterEvents(events, times, criteria, { ignorePeriod: true }),
        times,
        (i) => sourceIndex[i] ?? -1,
        dataset.sources.length,
        prepared.from,
        prepared.to,
      ),
    };
  }, [events, prepared, dataset.sources.length, from, to, sources, types, severities]);

  const labels = new Map(dataset.sources.map((s) => [s.name, s.label[lang]]));

  return (
    <main className="dataset">
      <div className="dataset-head">
        <h2>{summary.scenario.title[lang]}</h2>
        <p className="dataset-count" aria-live="polite">
          {t('timeline.count', { shown: indexes.length, total: events.length })}
        </p>
      </div>
      <FilterBar
        state={state}
        sources={dataset.sources}
        types={prepared.types}
        tz={tz}
        onChange={(next) => onChange(next)}
      />
      <HistogramChart
        histogram={histogram}
        selected={{
          from: state.from ? Date.parse(state.from) : undefined,
          to: state.to ? Date.parse(state.to) : undefined,
        }}
        tz={tz}
        onSelect={(from, to) =>
          onChange({ ...state, from: new Date(from).toISOString(), to: new Date(to).toISOString() })
        }
      />
      <EventList
        events={events}
        times={prepared.times}
        indexes={indexes}
        sourcePosition={prepared.sourcePosition}
        sourceLabel={(source) => labels.get(source) ?? source}
        tz={tz}
      />
    </main>
  );
}
