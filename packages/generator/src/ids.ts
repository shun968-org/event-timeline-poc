import type { IdKind } from '@event-timeline/core';
import type { Rng } from './rng';

/**
 * ランダムな関連 ID を重複なく払い出す。
 * 筋書きで固定に使う ID(例: O-10023)と衝突しないよう、桁数を変えている。
 */
export class IdFactory {
  private readonly used = new Set<string>();

  constructor(
    private readonly rng: Rng,
    reserved: Iterable<string> = [],
  ) {
    for (const id of reserved) this.used.add(id);
  }

  next(kind: IdKind): string {
    for (;;) {
      const id = this.make(kind);
      if (!this.used.has(id)) {
        this.used.add(id);
        return id;
      }
    }
  }

  private make(kind: IdKind): string {
    switch (kind) {
      case 'order':
        return `O-${this.rng.int(100000, 999999)}`;
      case 'user':
        return `U-${this.rng.int(100000, 999999)}`;
      case 'trace':
        return Array.from({ length: 16 }, () => this.rng.int(0, 15).toString(16)).join('');
    }
  }
}
