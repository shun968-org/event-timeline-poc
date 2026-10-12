import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('タイトルを表示する', () => {
    expect(renderToString(<App />)).toContain('Event Timeline PoC');
  });
});
