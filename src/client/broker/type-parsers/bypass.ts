import type { IPinotValueParser } from './types';

/**
 * Bypass parser.
 *
 * @public
 * @description
 * Returns the value as is.
 */
export class BypassParser implements IPinotValueParser {
  /**
   * Parses the value.
   * @param value - value to parse
   * @param type - value type
   *
   * @returns parsed value
   */
  parse(
    value?: number | string | boolean | object | null,
  ): number | string | boolean | object | null | undefined {
    return value;
  }
}
