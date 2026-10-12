import type { Scenario, SourceInfo, TimelineEvent } from '@event-timeline/core';
import { useState } from 'react';
import { FeedbackLinks } from '../feedback';
import { useT } from '../i18n';
import { formatShort } from '../timeline/time-format';
import type { TimeZoneMode } from '../view-state';

interface Props {
  scenario: Scenario;
  eventById: ReadonlyMap<string, TimelineEvent>;
  sources: readonly SourceInfo[];
  tz: TimeZoneMode;
  /** 正解の順序の項目を押したとき、そのイベントにタイムラインを移す */
  onJump: (eventId: string) => void;
}

/** 答え合わせ。「答えを見る」を押したときだけ、根本原因と発生順序を開く(基本設計 F-09) */
export function AnswerPanel({ scenario, eventById, sources, tz, onJump }: Props) {
  const { lang, t } = useT();
  const [open, setOpen] = useState(false);
  const { answer } = scenario;

  return (
    <section className="answer">
      <button
        type="button"
        className="answer-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? t('answer.hide') : t('answer.show')}
      </button>
      {open && (
        <div className="answer-body">
          <h3>{t('answer.rootCause')}</h3>
          <p>{answer.rootCause[lang]}</p>
          <h3>{t('answer.sequence')}</h3>
          <ol className="answer-sequence" aria-label={t('answer.sequence')}>
            {answer.sequence.map((id) => {
              const event = eventById.get(id);
              const source = sources.find((s) => s.name === event?.source);
              return (
                <li key={id}>
                  <button type="button" className="answer-step" onClick={() => onJump(id)}>
                    {event ? (
                      <>
                        <time dateTime={event.t}>{formatShort(Date.parse(event.t), tz)}</time>
                        <span className="muted">{source?.label[lang] ?? event.source}</span>
                        <span>{event.message}</span>
                      </>
                    ) : (
                      <code>{id}</code>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <FeedbackLinks />
        </div>
      )}
    </section>
  );
}
