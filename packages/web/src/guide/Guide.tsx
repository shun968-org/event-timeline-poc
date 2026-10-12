import type { Scenario } from '@event-timeline/core';
import { useState } from 'react';
import { useT } from '../i18n';
import { loadSetting, saveSetting } from '../storage';

const HINTS_SEEN_KEY = 'event-timeline:hints-seen';

/** タイムラインの上部に出す、シナリオの「調査の始め方」。閉じられる(基本設計 F-09) */
export function HowToStart({ scenario }: { scenario: Scenario }) {
  const { lang, t } = useT();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <section className="guide-banner" aria-label={t('guide.howToStart')}>
      <p>
        <strong>{t('guide.howToStart')}:</strong> {scenario.howToStart[lang]}
      </p>
      <button
        type="button"
        className="close-button"
        aria-label={t('guide.close')}
        onClick={() => setOpen(false)}
      >
        ×
      </button>
    </section>
  );
}

/** 操作のヒント。初めてのときだけ出し、閉じたことをブラウザに保存する */
export function Hints() {
  const { t } = useT();
  const [seen, setSeen] = useState(() => loadSetting(HINTS_SEEN_KEY) === '1');
  if (seen) return null;
  return (
    <section className="hints" aria-label={t('hints.title')}>
      <strong>{t('hints.title')}</strong>
      <ul>
        <li>{t('hints.selectEvent')}</li>
        <li>{t('hints.filterById')}</li>
        <li>{t('hints.dragHistogram')}</li>
      </ul>
      <button
        type="button"
        onClick={() => {
          saveSetting(HINTS_SEEN_KEY, '1');
          setSeen(true);
        }}
      >
        {t('hints.dismiss')}
      </button>
    </section>
  );
}
