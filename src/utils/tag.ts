import { Sql, type RawValue } from '@no-esm/sql-template-tag';

export {
  bulk,
  empty,
  join,
  raw,
  type RawValue,
  type Sql,
} from '@no-esm/sql-template-tag';

/**
 * SQL template tag
 *
 * @param strings - sql template
 * @param values - template values
 * @returns SQL statement
 */
export const sql = (
  strings: readonly string[],
  ...values: readonly RawValue[]
) => {
  return new Sql(strings, values);
};
