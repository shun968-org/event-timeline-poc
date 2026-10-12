import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { parseViewState, serializeViewState, type ViewState } from './view-state';

const NAVIGATE_EVENT = 'event-timeline:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

export interface NavigateOptions {
  /** 履歴を増やさない(入力中のキーワードなど、細かく変わる条件に使う) */
  replace?: boolean;
}

/** 画面の条件を URL から読み、変えるときは URL を書き換える(戻る・進むにも追従する) */
export function useViewState() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  const state = useMemo(() => parseViewState(search), [search]);
  const navigate = useCallback((next: ViewState, options: NavigateOptions = {}) => {
    const url = `${window.location.pathname}${serializeViewState(next)}${window.location.hash}`;
    if (options.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  }, []);
  return [state, navigate] as const;
}
