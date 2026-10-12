import { z } from 'zod';
import { ID_KINDS, SEVERITIES } from './vocab';

export const severitySchema = z.enum(SEVERITIES);
export const idKindSchema = z.enum(ID_KINDS);

/** 日本語と英語の文言の組 */
export const localizedTextSchema = z.object({
  ja: z.string().min(1),
  en: z.string().min(1),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** 情報源名。URL やファイル名にも使うので英小文字・数字・ハイフンに限る */
export const sourceNameSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
