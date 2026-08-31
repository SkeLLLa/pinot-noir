import type { Sql } from '@no-esm/sql-template-tag';

import type { IPinotQueryOptions } from '../client/clients';
import { NON_PINOT_OPTIONS } from '../client/clients';
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

    if (!firstLine) {
      return SqlUtils.formatOptions(options) || '';
    }

    // Get indentation of the first line
    const firstLineIndent = firstLine.length - firstLine.trimStart().length;

    // Process all lines preserving their relative indentation to the first line
    // and also remove trailing spaces from each line
    const processedLines = formattedSql.map((line, index) => {
      // Trim trailing spaces for all lines
      const trimmedLine = line.trimEnd();

      if (index === 0) {
        // First line gets no indentation
        return trimmedLine.trimStart();
      } else {
        // Calculate this line's indentation amount relative to first line
        const currentIndent =
          trimmedLine.length - trimmedLine.trimStart().length;
        // If current line has less indent than first line, preserve the difference
        // If current line has more indent than first line, add the difference
        const relativeIndent =
          currentIndent < firstLineIndent
            ? currentIndent // Maintain the same indentation if less than first line
            : currentIndent - firstLineIndent; // Otherwise, make it relative to first line

        return ' '.repeat(relativeIndent) + trimmedLine.trimStart();
      }
    });

    const sql = processedLines.join('\n');

    return [SqlUtils.formatOptions(options), sql].filter(Boolean).join('\n');
  }
}
