/** ファイル名のパターン(`*` と `?` だけ)に一致するか */
export function matchesPattern(name: string, pattern: string): boolean {
  const source = pattern
    .split('')
    .map((c) => (c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[.+^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${source}$`).test(name);
}
