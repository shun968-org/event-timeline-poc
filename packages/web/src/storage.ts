/**
 * ブラウザへの保存(言語・操作のヒントを表示済みかなど、利用者ごとの小さな設定だけ)。
 * プライベートブラウズなどで使えないときは、保存しないだけで画面は動かす。
 */
export function loadSetting(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveSetting(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 保存できなくても続ける
  }
}
