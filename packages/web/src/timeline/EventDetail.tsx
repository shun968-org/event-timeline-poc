import type { IdKind, SourceInfo, TimelineEvent } from '@event-timeline/core';
import { useT } from '../i18n';
import { formatDateTime } from './time-format';

interface Props {
  event: TimelineEvent;
  source: SourceInfo | undefined;
  onSelectId: (kind: IdKind, value: string) => void;
  onClose: () => void;
  /** スマートフォンの画面幅では、サイドパネルではなく全画面で開く */
  fullScreen: boolean;
}

function rawValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** 選んだイベントの共通項目と、変換前の元データ(基本設計 F-04) */
export function EventDetail({ event, source, onSelectId, onClose, fullScreen }: Props) {
  const { lang, t } = useT();
  const time = Date.parse(event.t);
  const idEntries = Object.entries(event.ids) as [IdKind, string[]][];

  return (
    <aside
      className={`event-detail${fullScreen ? ' event-detail-fullscreen' : ''}`}
      aria-label={t('detail.title')}
      {...(fullScreen && { role: 'dialog', 'aria-modal': true })}
    >
      <div className="event-detail-head">
        <h3>{t('detail.title')}</h3>
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label={t('detail.close')}
        >
          ×
        </button>
      </div>
      <p className={`event-detail-message severity-text-${event.severity}`}>{event.message}</p>

      <dl className="detail-list">
        <dt>{t('detail.time')}</dt>
        <dd>
          <div>{formatDateTime(time, 'jst')} JST</div>
          <div>{formatDateTime(time, 'utc')} UTC</div>
        </dd>
        <dt>{t('detail.source')}</dt>
        <dd>{source ? source.label[lang] : event.source}</dd>
        <dt>{t('detail.type')}</dt>
        <dd>
          <code>{event.type}</code>
        </dd>
        <dt>{t('detail.severity')}</dt>
        <dd className={`severity-${event.severity}`}>{event.severity}</dd>
        <dt>{t('detail.ids')}</dt>
        <dd>
          {idEntries.length === 0 ? (
            <span className="muted">{t('detail.noIds')}</span>
          ) : (
            <ul className="id-list">
              {idEntries.flatMap(([kind, values]) =>
                values.map((value) => (
                  <li key={`${kind}:${value}`}>
                    <span className="muted">{t(`id.${kind}`)}</span> <code>{value}</code>{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onSelectId(kind, value)}
                    >
                      {t('detail.filterById')}
                    </button>
                  </li>
                )),
              )}
            </ul>
          )}
        </dd>
      </dl>

      <h4>{t('detail.raw')}</h4>
      <dl className="detail-list detail-raw">
        <dt>{t('detail.file')}</dt>
        <dd>
          <code>
            {event.file}:{event.line}
          </code>
        </dd>
        <dt>{t('detail.originalTime')}</dt>
        <dd>
          <code>{event.originalTime}</code>
        </dd>
        {Object.entries(event.raw).map(([key, value]) => (
          <div key={key} className="detail-row">
            <dt>
              <code>{key}</code>
            </dt>
            <dd>
              <code>{rawValue(value)}</code>
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
