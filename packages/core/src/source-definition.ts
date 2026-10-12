import { z } from 'zod';
import { idKindSchema, localizedTextSchema, severitySchema, sourceNameSchema } from './common';

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** 項目名。CSV の列名、または JSON Lines のキー */
const fieldNameSchema = z.string().min(1);

/**
 * 情報源の定義ファイル(`sources/*.yaml`)。
 * 新しい情報源は、このファイルを1つ足すだけで取り込めるようにする(REQ-002)。
 */
export const sourceDefinitionSchema = z.strictObject({
  name: sourceNameSchema,
  label: localizedTextSchema,
  /** データセット内のファイル名パターン(glob) */
  file: z.string().min(1),
  format: z.enum(['csv', 'jsonl']),
  time: z.strictObject({
    field: fieldNameSchema,
    /** Luxon の書式、または `epoch_ms` / `iso8601` */
    format: z.string().min(1),
    /** 時刻にタイムゾーンが無いときに使う IANA のタイムゾーン名 */
    timezone: z.string().refine(isTimeZone, { message: '不明なタイムゾーン' }).default('UTC'),
  }),
  fields: z.strictObject({
    type: fieldNameSchema,
    message: fieldNameSchema,
    severity: z
      .strictObject({
        field: fieldNameSchema,
        map: z.record(z.string(), severitySchema).default({}),
        /** 対応表に無い値・項目が無いときの重要度 */
        default: severitySchema,
      })
      .optional(),
  }),
  /** 関連 ID の種類ごとに、その ID とみなす項目名(情報源によって名前が違ってよい) */
  ids: z.partialRecord(idKindSchema, z.array(fieldNameSchema).nonempty()).default({}),
});

/** 検証後の定義(既定値が埋まった状態) */
export type SourceDefinition = z.output<typeof sourceDefinitionSchema>;
