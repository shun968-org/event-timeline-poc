import type { IndexFile } from '@event-timeline/core';
import { useT } from '../i18n';

interface Props {
  index: IndexFile;
  onSelect: (dataset: string) => void;
}

/** トップ画面。何の試作かと、シナリオの一覧(基本設計 F-09) */
export function TopPage({ index, onSelect }: Props) {
  const { lang, t } = useT();
  return (
    <main className="top">
      <section className="intro">
        <p>{t('top.intro')}</p>
        <p>{t('top.howTo')}</p>
      </section>
      <h2>{t('top.scenarios')}</h2>
      {index.datasets.length === 0 ? (
        <p>{t('top.noScenarios')}</p>
      ) : (
        <ul className="scenario-list">
          {index.datasets.map((d) => (
            <li key={d.name}>
              <a
                className="scenario-card"
                href={`?dataset=${encodeURIComponent(d.name)}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(d.name);
                }}
              >
                <span className={`badge badge-${d.scenario.kind}`}>
                  {t(`scenario.kind.${d.scenario.kind}`)}
                </span>
                <strong className="scenario-title">{d.scenario.title[lang]}</strong>
                <span className="scenario-summary">{d.scenario.summary[lang]}</span>
                <span className="scenario-meta">
                  {t('top.eventCount', { count: d.eventCount })} ·{' '}
                  {d.sources.map((s) => s.label[lang]).join(' / ')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
