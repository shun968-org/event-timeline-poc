import { SEVERITIES, type Severity, type SourceInfo } from '@event-timeline/core';
import { useT } from '../i18n';
import { TIME_ZONES, type TimeZoneMode, type ViewState } from '../view-state';
import { sourceColor } from './colors';
import { formatDateTime, TIME_ZONE_LABEL } from './time-format';

interface Props {
  state: ViewState;
  sources: readonly SourceInfo[];
  types: readonly [type: string, count: number][];
  tz: TimeZoneMode;
  onChange: (next: ViewState) => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** 期間・情報源・種別・重要度の絞り込みと、時刻の表示の切り替え(基本設計 F-02) */
export function FilterBar({ state, sources, types, tz, onChange }: Props) {
  const { lang, t } = useT();
  const hasPeriod = state.from !== undefined || state.to !== undefined;
  const hasFilter =
    hasPeriod ||
    state.q !== undefined ||
    state.idValue !== undefined ||
    state.sources.length + state.types.length + state.severities.length > 0;

  return (
    <div className="filter-bar">
      <div className="filter-group" role="group" aria-label={t('filter.sources')}>
        <span className="filter-label">{t('filter.sources')}</span>
        {sources.map((source, i) => (
          <button
            key={source.name}
            type="button"
            className="chip"
            aria-pressed={state.sources.includes(source.name)}
            style={{ ['--source-color' as string]: sourceColor(i) }}
            onClick={() => onChange({ ...state, sources: toggle(state.sources, source.name) })}
          >
            <span className="chip-dot" aria-hidden="true" />
            {source.label[lang]}
          </button>
        ))}
      </div>

      <div className="filter-group" role="group" aria-label={t('filter.severities')}>
        <span className="filter-label">{t('filter.severities')}</span>
        {SEVERITIES.map((severity: Severity) => (
          <button
            key={severity}
            type="button"
            className={`chip severity-${severity}`}
            aria-pressed={state.severities.includes(severity)}
            onClick={() => onChange({ ...state, severities: toggle(state.severities, severity) })}
          >
            {severity}
          </button>
        ))}
      </div>

      <div className="filter-group">
        <details className="type-picker">
          <summary>
            {t('filter.types')}
            {state.types.length > 0 && ` (${state.types.length})`}
          </summary>
          <div className="type-picker-list">
            {types.map(([type, count]) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={state.types.includes(type)}
                  onChange={() => onChange({ ...state, types: toggle(state.types, type) })}
                />
                {type} <span className="muted">({count.toLocaleString(lang)})</span>
              </label>
            ))}
          </div>
        </details>

        <div className="tz-switch" role="group" aria-label={t('filter.timeZone')}>
          {TIME_ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              aria-pressed={zone === tz}
              onClick={() => onChange({ ...state, tz: zone })}
            >
              {TIME_ZONE_LABEL[zone]}
            </button>
          ))}
        </div>

        {hasFilter && (
          <button
            type="button"
            className="link-button"
            onClick={() =>
              onChange({
                ...state,
                from: undefined,
                to: undefined,
                sources: [],
                types: [],
                severities: [],
                q: undefined,
                idKind: undefined,
                idValue: undefined,
              })
            }
          >
            {t('filter.clearAll')}
          </button>
        )}
      </div>

      {hasPeriod && (
        <div className="filter-period">
          {t('filter.period', {
            from: state.from ? formatDateTime(Date.parse(state.from), tz).slice(0, 16) : '…',
            to: state.to ? formatDateTime(Date.parse(state.to), tz).slice(0, 16) : '…',
            tz: TIME_ZONE_LABEL[tz],
          })}
          <button
            type="button"
            className="link-button"
            onClick={() => onChange({ ...state, from: undefined, to: undefined })}
          >
            {t('filter.clearPeriod')}
          </button>
        </div>
      )}
    </div>
  );
}
