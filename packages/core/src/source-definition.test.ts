import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { sourceDefinitionSchema } from './source-definition';

// 基本設計「データ設計」の例
const example = `
name: business
label: { ja: 業務処理履歴, en: Business records }
file: "business*.csv"
format: csv
time:
  field: processed_at
  format: "yyyy/MM/dd HH:mm:ss"
  timezone: Asia/Tokyo
fields:
  type: event_type
  message: detail
  severity:
    field: status
    map: { OK: info, NG: error, RETRY: warn }
    default: info
ids:
  order: [order_id, orderId]
  user: [customer_id]
`;

const minimal = {
  name: 'app-log',
  label: { ja: 'アプリログ', en: 'App log' },
  file: 'app*.jsonl',
  format: 'jsonl',
  time: { field: 'ts', format: 'iso8601' },
  fields: { type: 'event', message: 'msg' },
};

describe('sourceDefinitionSchema', () => {
  it('データ設計の例を受け付ける', () => {
    const def = sourceDefinitionSchema.parse(parse(example));
    expect(def.ids.order).toEqual(['order_id', 'orderId']);
    expect(def.fields.severity?.map['NG']).toBe('error');
  });

  it('省略した項目に既定値を入れる', () => {
    const def = sourceDefinitionSchema.parse(minimal);
    expect(def.time.timezone).toBe('UTC');
    expect(def.ids).toEqual({});
    expect(def.fields.severity).toBeUndefined();
  });

  it.each([
    ['対応していない形式', { format: 'xml' }],
    ['不明なタイムゾーン', { time: { field: 'ts', format: 'iso8601', timezone: 'Mars/Base' } }],
    [
      '語彙に無い重要度',
      { fields: { type: 't', message: 'm', severity: { field: 's', default: 'fatal' } } },
    ],
    ['英語の表示名が無い', { label: { ja: 'アプリログ' } }],
    ['情報源名に大文字', { name: 'AppLog' }],
    ['未知の関連 ID の種類', { ids: { session: ['sid'] } }],
    ['関連 ID の項目名が空', { ids: { order: [] } }],
    ['綴りの誤り(未知のキー)', { fileds: {} }],
  ])('%s はエラーにする', (_, override) => {
    expect(sourceDefinitionSchema.safeParse({ ...minimal, ...override }).success).toBe(false);
  });
});
