import { useT } from './i18n';

const DISCUSSIONS_URL = 'https://github.com/shun968-org/event-timeline-poc/discussions';

/** 感想・要望の受け口(GitHub Discussions のカテゴリと投票)。画面には書き込み機能を持たない(基本設計 F-12) */
export const FEEDBACK_URLS = {
  general: `${DISCUSSIONS_URL}/categories/general`,
  ideas: `${DISCUSSIONS_URL}/categories/ideas`,
  polls: `${DISCUSSIONS_URL}/36`,
} as const;

type FeedbackKind = keyof typeof FEEDBACK_URLS;

/** 外部へのリンク。新しいタブで開き、移動先に元のページを渡さない */
export function FeedbackLink({ kind, className }: { kind: FeedbackKind; className?: string }) {
  const { t } = useT();
  return (
    <a className={className} href={FEEDBACK_URLS[kind]} target="_blank" rel="noopener noreferrer">
      {t(`feedback.${kind}`)}
    </a>
  );
}

/** 感想・改善要望・投票へのリンクをまとめたもの(トップ画面・答え合わせのパネル) */
export function FeedbackLinks() {
  const { t } = useT();
  return (
    <section className="feedback" aria-label={t('feedback.title')}>
      <p>{t('feedback.lead')}</p>
      <ul>
        <li>
          <FeedbackLink kind="general" />
        </li>
        <li>
          <FeedbackLink kind="ideas" />
        </li>
        <li>
          <FeedbackLink kind="polls" />
        </li>
      </ul>
    </section>
  );
}
