import { useSyncExternalStore } from 'react';

/** スマートフォンの画面幅(styles.css の @media と同じ値) */
export const COMPACT_QUERY = '(max-width: 640px)';

function mediaQuery(query: string): MediaQueryList | undefined {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : undefined;
}

/** 画面幅がスマートフォン向けか。幅が変わったら描き直す(基本設計 F-02・REQ-019) */
export function useCompactLayout(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = mediaQuery(COMPACT_QUERY);
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    () => mediaQuery(COMPACT_QUERY)?.matches ?? false,
    () => false,
  );
}
