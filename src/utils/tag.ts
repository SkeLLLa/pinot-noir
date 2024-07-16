import { Sql, type RawValue } from '@taylorgoolsby/sql-template-tag';

export {
  bulk,
  empty,
  join,
  raw,
  type RawValue,
  type Sql,
} from '@taylorgoolsby/sql-template-tag';
export const sql = (
  strings: readonly string[],
  ...values: readonly RawValue[]
) => {
  return new Sql(strings, values);
};
