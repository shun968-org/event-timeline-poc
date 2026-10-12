import type { TimelineEvent } from '@event-timeline/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { useT } from '../i18n';
import type { TimeZoneMode } from '../view-state';
import { sourceColor } from './colors';
import { formatShort } from './time-format';

/** 行の高さ。スマートフォンの画面幅では2行のカードにする */
export const ROW_HEIGHT = { wide: 34, compact: 56 } as const;

interface Props {
  events: readonly TimelineEvent[];
  times: readonly number[];
  /** 表示する events の添字(発生順) */
  indexes: readonly number[];
  sourcePosition: ReadonlyMap<string, number>;
  sourceLabel: (source: string) => string;
  tz: TimeZoneMode;
  selectedId: string | undefined;
  onSelect: (event: TimelineEvent) => void;
  /** 該当0件のときの文言 */
  emptyMessage: string;
  /** スマートフォンの画面幅(2行のカード表示) */
  compact: boolean;
}

/** イベントの一覧。1万件でも滑らかに動くよう、見えている行だけを描く(仮想スクロール) */
export function EventList({
  events,
  times,
  indexes,
  sourcePosition,
  sourceLabel,
  tz,
  selectedId,
  onSelect,
  emptyMessage,
  compact,
}: Props) {
  const rowHeight = compact ? ROW_HEIGHT.compact : ROW_HEIGHT.wide;
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  // React Compiler は使っていないので、メモ化できない API でも問題ない
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: indexes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
    // 大きさを測れない環境(テストなど)でも先頭の行を描く
    initialRect: { width: 0, height: 20 * rowHeight },
  });

  // 選ばれたイベントが一覧の外(URL を開いたとき・答え合わせから移ったとき)なら、そこまで動かす
  const selectedPosition = selectedId ? indexes.findIndex((i) => events[i]?.id === selectedId) : -1;
  useEffect(() => {
    // 'auto' は見えていれば動かさない
    if (selectedPosition >= 0) virtualizer.scrollToIndex(selectedPosition, { align: 'auto' });
    // 選択が変わったときだけ動かす(スクロールのたびに戻さない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedPosition]);

  if (indexes.length === 0) {
    return <p className="event-list-empty">{emptyMessage}</p>;
  }

  return (
    <div
      className={`event-list${compact ? ' event-list-compact' : ''}`}
      ref={scrollRef}
      role="listbox"
      aria-label={t('timeline.listLabel')}
      tabIndex={-1}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const index = indexes[item.index];
          const event = index === undefined ? undefined : events[index];
          if (index === undefined || !event) return null;
          const high = event.severity === 'error' || event.severity === 'critical';
          const selected = event.id === selectedId;
          return (
            <div
              key={event.id}
              role="option"
              aria-selected={selected}
              tabIndex={0}
              className={`event-row${high ? ' event-row-high' : ''}${selected ? ' event-row-selected' : ''}`}
              style={{
                transform: `translateY(${item.start}px)`,
                height: rowHeight,
                ['--source-color' as string]: sourceColor(sourcePosition.get(event.source) ?? 0),
              }}
              onClick={() => onSelect(event)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(event);
                }
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
