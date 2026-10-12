import { useState, type PointerEvent } from 'react';
import { useT } from '../i18n';
import type { TimeZoneMode } from '../view-state';
import { sourceColor } from './colors';
import type { Histogram } from './histogram';
import { formatTick, ticks } from './time-format';

interface Props {
  histogram: Histogram;
  /** 選択中の期間(UTC のミリ秒) */
  selected: { from: number | undefined; to: number | undefined };
  tz: TimeZoneMode;
  onSelect: (from: number, to: number) => void;
  /** スマートフォンの画面幅(目盛りを間引く) */
  compact: boolean;
}

const HOUR = 3_600_000;

/** ドラッグした区間(端を含む)を期間 [from, to) にする */
export function bucketRange(
  histogram: Pick<Histogram, 'start' | 'bucketMs'>,
  anchor: number,
  current: number,
): [from: number, to: number] {
  const first = Math.min(anchor, current);
  const last = Math.max(anchor, current);
  return [
    histogram.start + first * histogram.bucketMs,
    histogram.start + (last + 1) * histogram.bucketMs,
  ];
}

/** 時間帯ごとの件数(情報源ごとの積み上げ)。ドラッグで期間を選ぶ(基本設計 F-02) */
export function HistogramChart({ histogram, selected, tz, onSelect, compact }: Props) {
  const { t } = useT();
  const [drag, setDrag] = useState<{ anchor: number; current: number }>();
  const bucketCount = histogram.counts.length;
  const span = bucketCount * histogram.bucketMs;
  const end = histogram.start + span;

  const bucketAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    return Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)));
  };

  let highlight: [number, number] | undefined;
  if (drag) highlight = bucketRange(histogram, drag.anchor, drag.current);
  else if (selected.from !== undefined || selected.to !== undefined)
    highlight = [selected.from ?? histogram.start, selected.to ?? end];

  const toX = (ms: number) => ((ms - histogram.start) / histogram.bucketMs).toFixed(3);
  const baseStep = span > 36 * HOUR ? 12 * HOUR : span > 12 * HOUR ? 3 * HOUR : HOUR;
  const tickStep = compact ? baseStep * 2 : baseStep;

  return (
    <div className="histogram">
      <svg
        viewBox={`0 0 ${bucketCount} 100`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('histogram.label')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const bucket = bucketAt(e);
          setDrag({ anchor: bucket, current: bucket });
        }}
        onPointerMove={(e) => {
          if (drag) setDrag({ ...drag, current: bucketAt(e) });
        }}
        onPointerUp={(e) => {
          if (!drag) return;
          const [from, to] = bucketRange(histogram, drag.anchor, bucketAt(e));
          setDrag(undefined);
          onSelect(from, to);
        }}
        onPointerCancel={() => setDrag(undefined)}
      >
        {highlight && (
          <rect
            className="histogram-selection"
            x={toX(highlight[0])}
            y={0}
            width={((highlight[1] - highlight[0]) / histogram.bucketMs).toFixed(3)}
            height={100}
          />
        )}
        {histogram.counts.map((bucket, i) => {
          let y = 100;
          return bucket.map((count, source) => {
            if (count === 0) return null;
            const height = (count / histogram.max) * 96;
            y -= height;
            return (
              <rect
                key={`${i}-${source}`}
                x={i + 0.08}
                y={y}
                width={0.84}
                height={height}
                fill={sourceColor(source)}
              />
            );
          });
        })}
      </svg>
      <div className="histogram-axis" aria-hidden="true">
        {ticks(histogram.start, end, tickStep, tz).map((tick) => (
          <span key={tick} style={{ left: `${((tick - histogram.start) / span) * 100}%` }}>
            {formatTick(tick, tz)}
          </span>
        ))}
      </div>
      <p className="histogram-hint">{t('histogram.hint')}</p>
    </div>
  );
}
