import { LANGS, type Lang } from '@event-timeline/core';
import { useT } from '../i18n';

interface Props {
  onHome: () => void;
  onChangeLang: (lang: Lang) => void;
}

/** 全画面の上部。題名・言語の切り替えと、架空のデータであることの常時表示(REQ-013) */
export function Header({ onHome, onChangeLang }: Props) {
  const { lang, t } = useT();
  return (
    <header className="header">
      <div className="header-bar">
        <a
          className="header-title"
          href="?"
          onClick={(e) => {
            e.preventDefault();
            onHome();
          }}
        >
          {t('app.title')}
        </a>
        <div className="lang-switch" role="group" aria-label={t('header.language')}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => onChangeLang(l)}>
              {t(`header.lang.${l}`)}
            </button>
          ))}
        </div>
      </div>
      <p className="synthetic-notice">{t('header.syntheticNotice')}</p>
    </header>
  );
}
