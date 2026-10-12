import { describe, expect, it } from 'vitest';
import { eventFixture } from '../test-fixtures';
import { countTypes, filterEvents, prepareEvents, type FilterCriteria } from './filter';

const events = [
  eventFixture({
    id: 'a',
    t: '2026-10-05T00:00:00.000Z',
    source: 'app',
    type: 'login',
    message: 'Login OK',
    ids: { user: ['U-1'], trace: ['abc'] },
  }),
  eventFixture({
    id: 'b',
    t: '2026-10-05T01:00:00.000Z',
    source: 'audit',
    severity: 'error',
    message: 'Account LOCKED',
    ids: { user: ['U-1'], order: ['O-9'] },
  }),
  eventFixture({
    id: 'c',
    t: '2026-10-05T02:00:00.000Z',
    source: 'app',
    severity: 'critical',
    message: 'Pool exhausted',
    ids: {},
  }),
  eventFixture({
    id: 'd',
    t: '2026-10-05T03:00:00.000Z',
    source: 'infra',
    type: 'login',
    message: 'Unlocked by support',
    ids: { user: ['u-1'] },
  }),
];
const prepared = prepareEvents(events);
const none: FilterCriteria = { sources: [], types: [], severities: [] };
const ids = (criteria: Partial<FilterCriteria>, options = {}) =>
  filterEvents(prepared, { ...none, ...criteria }, options).map((i) => events[i]?.id);

describe('filterEvents', () => {
  it('条件が無ければ全件を発生順のまま返す', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd']);
  });

  it('期間は from 以上 to 未満', () => {
    const period = { from: '2026-10-05T01:00:00.000Z', to: '2026-10-05T03:00:00.000Z' };
    expect(ids(period)).toEqual(['b', 'c']);
    expect(ids(period, { ignorePeriod: true })).toHaveLength(4);
  });

  it('情報源・種別・重要度は、それぞれの中では「いずれか」、条件どうしは「かつ」', () => {
    expect(ids({ sources: ['app', 'infra'] })).toEqual(['a', 'c', 'd']);
    expect(ids({ sources: ['app', 'infra'], types: ['login'] })).toEqual(['a', 'd']);
    expect(ids({ severities: ['error', 'critical'] })).toEqual(['b', 'c']);
  });

  it('キーワードはメッセージの部分一致で、大文字小文字を区別しない', () => {
    expect(ids({ q: 'locked' })).toEqual(['b', 'd']);
    expect(ids({ q: 'LOCKED', sources: ['audit'] })).toEqual(['b']);
  });

  it('関連 ID で全情報源から抜き出し、ほかの条件と組み合わせられる', () => {
    expect(ids({ idKind: 'user', idValue: 'U-1' })).toEqual(['a', 'b', 'd']);
    expect(ids({ idKind: 'user', idValue: ' u-1 ' })).toEqual(['a', 'b', 'd']);
    expect(ids({ idKind: 'order', idValue: 'O-9' })).toEqual(['b']);
    expect(ids({ idKind: 'user', idValue: 'U-1', sources: ['app'] })).toEqual(['a']);
    expect(ids({ idKind: 'trace', idValue: 'U-1' })).toEqual([]);
  });
});

describe('prepareEvents', () => {
  it('関連 ID の索引を種類ごとに作る', () => {
    expect(prepared.ids.get('user:u-1')).toEqual([0, 1, 3]);
    expect(prepared.ids.get('trace:abc')).toEqual([0]);
    expect(prepared.ids.has('order:abc')).toBe(false);
  });
});

describe('countTypes', () => {
  it('多い順、同数なら名前順', () => {
    expect(countTypes(events)).toEqual([
      ['login', 2],
      ['login_failed', 2],
    ]);
  });
});
