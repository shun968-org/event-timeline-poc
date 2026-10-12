import type { DatasetFile, DatasetSummary } from '@event-timeline/core';
import { useMemo } from 'react';
import { useT } from '../i18n';
import type { NavigateOptions } from '../navigation';
import { EventDetail } from '../timeline/EventDetail';
import { EventList } from '../timeline/EventList';
import { countTypes, filterEvents, prepareEvents } from '../timeline/filter';
import { FilterBar } from '../timeline/FilterBar';
import { buildHistogram } from '../timeline/histogram';
import { HistogramChart } from '../timeline/HistogramChart';
import { IdFilterBanner, SearchBar } from '../timeline/SearchBar';
import type { ViewState } from '../view-state';

interface Props {
  summary: DatasetSummary;
  dataset: DatasetFile;
  state: ViewState;
  onChange: (next: ViewState, options?: NavigateOptions) => void;
}

/** データセットのタイムライン画面(基本設計 F-02〜F-05) */
export function DatasetPage({ summary, dataset, state, onChange }: Props) {
  const { lang, t } = useT();
  const tz = state.tz ?? (lang === 'en' ? 'utc' : 'jst');
  const { events } = dataset;

  // データセットごとに一度だけ求めるもの(関連 ID の索引を含む)
  const prepared = useMemo(() => {
    const sourcePosition = new Map(dataset.sources.map((s, i) => [s.name, i]));
    return {
      ...prepareEvents(events),
      sourcePosition,
      sourceIndex: events.map((e) => sourcePosition.get(e.source) ?? -1),
      types: countTypes(events),
      from: Date.parse(summary.from),
      to: Date.parse(summary.to),
    };
  }, [events, dataset.sources, summary.from, summary.to]);

  // state は URL が変わったときだけ作り直されるので、条件の配列をそのまま依存に使える
  const { from, to, sources, types, severities, q, idKind, idValue } = state;
  const { indexes, histogram } = useMemo(() => {
    const criteria = { from, to, sources, types, severities, q, idKind, idValue };
    return {
      indexes: filterEvents(prepared, criteria),
      histogram: buildHistogram(
        filterEvents(prepared, criteria, { ignorePeriod: true }),
        prepared.times,
        (i) => prepared.sourceIndex[i] ?? -1,
        dataset.sources.length,
        prepared.from,
        prepared.to,
      ),
    };
  }, [prepared, dataset.sources.length, from, to, sources, types, severities, q, idKind, idValue]);

  const labels = new Map(dataset.sources.map((s) => [s.name, s.label[lang]]));
  const selected = state.event ? events.find((e) => e.id === state.event) : undefined;

  let emptyMessage = t('timeline.noEvents');
  if (idKind && idValue)
    emptyMessage = t('timeline.noEventsForId', { kind: t(`id.${idKind}`), value: idValue });
  else if (q) emptyMessage = t('timeline.noEventsForKeyword', { value: q });

  return (
    <main className={`dataset${selected ? ' dataset-with-detail' : ''}`}>
      <div className="dataset-main">
        <div className="dataset-head">
          <h2>{summary.scenario.title[lang]}</h2>
          <p className="dataset-count" aria-live="polite">
            {t('timeline.count', { shown: indexes.length, total: events.length })}
          </p>
        </div>
        <SearchBar state={state} onChange={onChange} />
        <IdFilterBanner state={state} onChange={onChange} />
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
            from: from ? Date.parse(from) : undefined,
            to: to ? Date.parse(to) : undefined,
          }}
          tz={tz}
          onSelect={(start, end) =>
            onChange({
              ...state,
              from: new Date(start).toISOString(),
              to: new Date(end).toISOString(),
            })
          }
        />
        <EventList
          events={events}
          times={prepared.times}
          indexes={indexes}
          sourcePosition={prepared.sourcePosition}
          sourceLabel={(source) => labels.get(source) ?? source}
          tz={tz}
          selectedId={selected?.id}
          onSelect={(event) => onChange({ ...state, event: event.id })}
          emptyMessage={emptyMessage}
        />
      </div>
      {selected && (
        <EventDetail
          event={selected}
          source={dataset.sources.find((s) => s.name === selected.source)}
          onSelectId={(kind, value) => onChange({ ...state, idKind: kind, idValue: value })}
          onClose={() => onChange({ ...state, event: undefined })}
        />
      )}
    </main>
  );
}
