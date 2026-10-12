/**
 * イベント ID。元ファイル名と行番号(1始まり、CSV はヘッダー行を含む)から作る。
 * 合成データ生成が正解の順序を書くときと、取り込みがイベントに付けるときで同じ規則を使う。
 */
export function eventId(file: string, line: number): string {
  return `${file}:${line}`;
}
