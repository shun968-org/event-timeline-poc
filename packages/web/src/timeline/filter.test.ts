import { describe, expect, it } from 'vitest';
import { eventFixture } from '../test-fixtures';
import { countTypes, filterEvents, type FilterCriteria } from './filter';

const events = [
  eventFixture({ id: 'a', t: '2026-10-05T00:00:00.000Z', source: 'app', type: 'login' }),
  eventFixture({ id: 'b', t: '2026-10-05T01:00:00.000Z', source: 'audit', severity: 'error' }),
  eventFixture({ id: 'c', t: '2026-10-05T02:00:00.000Z', source: 'app', severity: 'critical' }),
  eventFixture({ id: 'd', t: '2026-10-05T03:00:00.000Z', source: 'infra', type: 'login' }),
];
const times = events.map((e) => Date.parse(e.t));
const none: FilterCriteria = { sources: [], types: [], severities: [] };
const ids = (indexes: number[]) => indexes.map((i) => events[i]?.id);

describe('filterEvents', () => {
  it('条件が無ければ全件を発生順のまま返す', () => {
    expect(ids(filterEvents(events, times, none))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('期間は from 以上 to 未満', () => {
    const criteria = { ...none, from: '2026-10-05T01:00:00.000Z', to: '2026-10-05T03:00:00.000Z' };
    expect(ids(filterEvents(events, times, criteria))).toEqual(['b', 'c']);
    expect(ids(filterEvents(events, times, criteria, { ignorePeriod: true }))).toHaveLength(4);
  });

  it('情報源・種別・重要度は、それぞれの中では「いずれか」、条件どうしは「かつ」', () => {
    expect(ids(filterEvents(events, times, { ...none, sources: ['app', 'infra'] }))).toEqual([
      'a',
      'c',
      'd',
    ]);
    expect(
      ids(filterEvents(events, times, { ...none, sources: ['app', 'infra'], types: ['login'] })),
    ).toEqual(['a', 'd']);
    expect(
      ids(filterEvents(events, times, { ...none, severities: ['error', 'critical'] })),
    ).toEqual(['b', 'c']);
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
