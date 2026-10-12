import type { TimelineEvent } from '@event-timeline/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { useT } from '../i18n';
import type { TimeZoneMode } from '../view-state';
import { sourceColor } from './colors';
import { formatShort } from './time-format';

const ROW_HEIGHT = 34;

interface Props {
  events: readonly TimelineEvent[];
  times: readonly number[];
  /** 表示する events の添字(発生順) */
  indexes: readonly number[];
  sourcePosition: ReadonlyMap<string, number>;
  sourceLabel: (source: string) => string;
  tz: TimeZoneMode;
}

/** イベントの一覧。1万件でも滑らかに動くよう、見えている行だけを描く(仮想スクロール) */
export function EventList({ events, times, indexes, sourcePosition, sourceLabel, tz }: Props) {
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  // React Compiler は使っていないので、メモ化できない API でも問題ない
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: indexes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
    // 大きさを測れない環境(テストなど)でも先頭の行を描く
    initialRect: { width: 0, height: 20 * ROW_HEIGHT },
  });

  if (indexes.length === 0) {
    return <p className="event-list-empty">{t('timeline.noEvents')}</p>;
  }

  return (
    <div className="event-list" ref={scrollRef} role="list" aria-label={t('timeline.listLabel')}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const index = indexes[item.index];
          const event = index === undefined ? undefined : events[index];
          if (index === undefined || !event) return null;
          const high = event.severity === 'error' || event.severity === 'critical';
          return (
            <div
              key={event.id}
              role="listitem"
              className={`event-row${high ? ' event-row-high' : ''}`}
              style={{
                transform: `translateY(${item.start}px)`,
                height: ROW_HEIGHT,
                ['--source-color' as string]: sourceColor(sourcePosition.get(event.source) ?? 0),
              }}
            >
              <time className="event-time" dateTime={event.t}>
                {formatShort(times[index] ?? 0, tz)}
              </time>
              <span className="event-source">{sourceLabel(event.source)}</span>
              <span className={`event-severity severity-${event.severity}`}>{event.severity}</span>
              <span className="event-type">{event.type}</span>
              <span className="event-message">{event.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
