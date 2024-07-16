import { RawValue, Sql } from 'sql-template-tag';

export * from 'sql-template-tag';

export const sql = (
  strings: readonly string[],
  ...values: readonly RawValue[]
) => {
  return new Sql(strings, values);
};
