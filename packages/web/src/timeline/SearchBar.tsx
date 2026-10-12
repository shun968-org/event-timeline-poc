import { ID_KINDS, type IdKind } from '@event-timeline/core';
import { useState } from 'react';
import { useT } from '../i18n';
import type { NavigateOptions } from '../navigation';
import type { ViewState } from '../view-state';

interface Props {
  state: ViewState;
  onChange: (next: ViewState, options?: NavigateOptions) => void;
}

/** キーワード検索(F-05)と、関連 ID の入力(F-03) */
export function SearchBar({ state, onChange }: Props) {
  const { t } = useT();
  // 入力中の文字(末尾の空白など)を保つため、URL とは別に持つ。URL 側が変わったら合わせる
  const [keyword, setKeyword] = useState(state.q ?? '');
  const [syncedQ, setSyncedQ] = useState(state.q);
  if (state.q !== syncedQ) {
    setSyncedQ(state.q);
    if ((keyword.trim() || undefined) !== state.q) setKeyword(state.q ?? '');
  }

  const [idKind, setIdKind] = useState<IdKind>(state.idKind ?? 'order');
  const [idValue, setIdValue] = useState('');

  return (
    <div className="search-bar">
      <input
        type="search"
        className="keyword-input"
        placeholder={t('search.keywordPlaceholder')}
        aria-label={t('search.keyword')}
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          onChange({ ...state, q: e.target.value.trim() || undefined }, { replace: true });
        }}
      />
      <form
        className="id-search"
        role="search"
        aria-label={t('search.id')}
        onSubmit={(e) => {
          e.preventDefault();
          const value = idValue.trim();
          if (!value) return;
          onChange({ ...state, idKind, idValue: value });
          setIdValue('');
        }}
      >
        <select
          aria-label={t('search.idKind')}
          value={idKind}
          onChange={(e) => setIdKind(e.target.value as IdKind)}
        >
          {ID_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`id.${kind}`)}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label={t('search.idValue')}
          placeholder={t('search.idPlaceholder')}
          value={idValue}
          onChange={(e) => setIdValue(e.target.value)}
        />
        <button type="submit">{t('search.idSubmit')}</button>
      </form>
    </div>
  );
}

/** 関連 ID で絞り込み中であることの表示と、1操作での解除(F-03) */
export function IdFilterBanner({ state, onChange }: Props) {
  const { t } = useT();
  if (!state.idKind || !state.idValue) return null;
  return (
    <div className="id-filter-banner" role="status">
      <span>{t('search.idActive', { kind: t(`id.${state.idKind}`), value: state.idValue })}</span>
      <button
        type="button"
        className="link-button"
        onClick={() => onChange({ ...state, idKind: undefined, idValue: undefined })}
      >
        {t('search.idClear')}
      </button>
    </div>
  );
}
