import { Sql } from '@no-esm/sql-template-tag';
import { IPinotQueryOptions } from '../client/clients';
import { SqlFormat } from './format';

/**
 * Sql utils class.
 *
 * @public
 */
export class SqlUtils {
  /**
   * Format pinot options to make them embeddable into query.
   *
   * @param options - Pinot query options
   * @returns Serialized options
   */
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

  /**
   * Compile and transform sql query with options into string.
   * Might be helpful for logging and copy-paste debugging.
   *
   * @param query - Pinot sql query
   * @param options - Pinot query options
   * @returns Serialized query string
   */
  static stringifyQuery(query: Sql, options?: IPinotQueryOptions) {
    const sql = SqlFormat.format(query.sql, query.values);

    return [SqlUtils.formatOptions(options), sql].filter((x) => !!x).join('\n');
  }
}
