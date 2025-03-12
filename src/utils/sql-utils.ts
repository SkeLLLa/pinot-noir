import { Sql } from '@no-esm/sql-template-tag';
import { IPinotQueryOptions, NON_PINOT_OPTIONS } from '../client/clients';
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
      .filter(([k]) => {
        return !NON_PINOT_OPTIONS.includes(k as keyof IPinotQueryOptions);
      })
      .map(([key, value]) => {
        switch (typeof value) {
          case 'string':
            return `SET ${key} = '${value}';`;
          case 'number':
            return `SET ${key} = ${value.toString()};`;
          case 'boolean':
            return `SET ${key} = ${value.toString()};`;
          default:
            // invalid key
            return ``;
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
  static stringifyQuery(query: Sql, options?: IPinotQueryOptions): string {
    const formattedSql = SqlFormat.format(query.sql, query.values)
      .split('\n')
      .filter((line) => line.trim() !== '');
    const firstLine = formattedSql[0];
    const indent =
      typeof firstLine !== 'undefined'
        ? firstLine.length - firstLine.trimStart().length
        : 0;
    const sql = formattedSql.map((line) => line.slice(indent)).join('\n');

    return [SqlUtils.formatOptions(options), sql].filter(Boolean).join('\n');
  }
}
