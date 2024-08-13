import { Sql } from '@no-esm/sql-template-tag';
import { IPinotQueryOptions } from '../client/clients';
import { SqlFormat } from './format';

export class SqlUtils {
  static formatOptions(options?: IPinotQueryOptions): string {
    if (!options) {
      return '';
    }
    return Object.entries(options)
      .map(([key, value]) => {
        switch (typeof value) {
          case 'string':
            return `SET ${key} = '${value}';`;
          case 'number':
            return `SET ${key} = ${value};`;
          case 'boolean':
            return `SET ${key} = ${value};`;
          default:
            return `SET ${key} = '${value}';`;
        }
      })
      .join('\n');
  }

  static stringifyQuery(query: Sql, options?: IPinotQueryOptions) {
    const sql = SqlFormat.format(query.sql, query.values);

    return [SqlUtils.formatOptions(options), sql].filter((x) => !!x).join('\n');
  }
}
