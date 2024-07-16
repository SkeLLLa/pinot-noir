import { Sql } from 'sql-template-tag';

export * from 'sql-template-tag';

export const sql = (
  strings: readonly string[],
  ...values: readonly unknown[]
) => {
  return new Sql(strings, values);
};
