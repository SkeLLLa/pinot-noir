import { RawValue, Sql } from 'sql-template-tag';

export {
  bulk,
  empty,
  join,
  raw,
  type RawValue,
  type Sql,
} from 'sql-template-tag';
export const sql = (
  strings: readonly string[],
  ...values: readonly RawValue[]
) => {
  return new Sql(strings, values);
};
