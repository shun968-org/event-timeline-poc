import { useT } from '../i18n';
import { useMeasurements } from '../perf';

/** 処理時間の表示(URL の末尾に `#perf` を付けたときだけ出す。非機能設計「性能」の計測用) */
export function PerfPanel() {
  const { t } = useT();
  const measurements = useMeasurements();
  return (
    <aside className="perf-panel" aria-label={t('perf.title')}>
      <h2>{t('perf.title')}</h2>
      {measurements.length === 0 ? (
        <p>{t('perf.empty')}</p>
      ) : (
        <dl>
          {measurements.map((m, i) => (
            <div key={i}>
              <dt>{t(`perf.${m.name}`)}</dt>
              <dd>{Math.round(m.ms).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
