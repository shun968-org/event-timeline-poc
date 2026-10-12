/** 情報源の色。データセットの情報源の並び順に割り当てる(明暗どちらの背景でも読める色) */
const SOURCE_PALETTE = ['#3b7ddd', '#e08a1e', '#2f9e5b', '#9b5de5', '#d6457a', '#1fa2b8'];

export function sourceColor(position: number): string {
  return SOURCE_PALETTE[position % SOURCE_PALETTE.length] ?? '#888888';
}
