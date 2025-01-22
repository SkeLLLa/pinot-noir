import { TPinotDataType } from '../broker-respone.types';

/**
 * Pinot value parser interface.
 *
 * @public
 */
export interface IPinotValueParser {
  /**
   * Parses the value.
   * @param value - value to parse
   * @param type - value type
   *
   * @returns parsed value
   */
  parse(
    value?: number | string | boolean | object | null | Date,
    type?: TPinotDataType,
  ): number | string | boolean | object | null | Date | bigint | undefined;
}
