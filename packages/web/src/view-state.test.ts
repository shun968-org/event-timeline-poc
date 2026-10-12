import { describe, expect, it } from 'vitest';
import { EMPTY_VIEW_STATE, parseViewState, serializeViewState, type ViewState } from './view-state';

describe('parseViewState', () => {
  it('空のクエリは条件なし', () => {
    expect(parseViewState('')).toEqual(parseViewState('?'));
    expect(parseViewState('')).toMatchObject(EMPTY_VIEW_STATE);
  });

  it('全ての条件を読む', () => {
    const state = parseViewState(
      '?dataset=s4-missing-mail&from=2026-10-04T00:00:00Z&to=2026-10-04T06:00:00.000Z' +
        '&sources=app,business&types=order_placed&severities=error,critical&q=retry' +
        '&idKind=order&idValue=O-30517&event=app.jsonl:12&tz=utc&lang=en',
    );
    expect(state).toEqual({
      dataset: 's4-missing-mail',
      from: '2026-10-04T00:00:00.000Z',
      to: '2026-10-04T06:00:00.000Z',
      sources: ['app', 'business'],
      types: ['order_placed'],
      severities: ['error', 'critical'],
      q: 'retry',
      idKind: 'order',
      idValue: 'O-30517',
      event: 'app.jsonl:12',
      tz: 'utc',
      lang: 'en',
    });
  });

  it('解釈できない値は、その条件だけ無視する', () => {
    const state = parseViewState(
      '?dataset=../secret&lang=fr&tz=pst&from=yesterday&severities=error,fatal' +
        '&sources=App,infra&idKind=email&idValue=a@example.com&q=%20%20',
    );
    expect(state).toEqual({
      ...EMPTY_VIEW_STATE,
      dataset: undefined,
      lang: undefined,
      tz: undefined,
      from: undefined,
      to: undefined,
      sources: ['infra'],
      severities: ['error'],
      q: undefined,
      idKind: undefined,
      idValue: undefined,
      event: undefined,
    });
  });

  it('値の無い関連 ID の種類と、逆転した期間は無視する', () => {
    const state = parseViewState('?idKind=user&from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z');
    expect(state.idKind).toBeUndefined();
    expect(state.from).toBeUndefined();
    expect(state.to).toBeUndefined();
  });
});

describe('serializeViewState', () => {
  it('条件が無ければ空文字', () => {
    expect(serializeViewState(EMPTY_VIEW_STATE)).toBe('');
  });

  it('読んで書くと元に戻る', () => {
    const state: ViewState = {
      ...EMPTY_VIEW_STATE,
      dataset: 's5-login-locked',
      sources: ['app', 'audit'],
      severities: ['warn'],
      q: 'locked out',
      idKind: 'user',
      idValue: 'U-77102',
      lang: 'ja',
    };
    const query = serializeViewState(state);
    expect(query).toBe(
      '?dataset=s5-login-locked&sources=app%2Caudit&severities=warn&q=locked+out' +
        '&idKind=user&idValue=U-77102&lang=ja',
    );
    expect(parseViewState(query)).toMatchObject(state);
  });
});
