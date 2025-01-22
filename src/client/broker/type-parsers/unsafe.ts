import type { TPinotDataType } from '../broker-respone.types';
import type { IPinotValueParser } from './types';

/**
 * Unsafe parser.
 *
 * @public
 * @description
 *
 * Parses the value unsafely. Longs are casted to ints.
 */
export class UnsafeParser implements IPinotValueParser {
  /**
   * Parses the value.
   * @param value - value to parse
   * @param type - value type
   *
   * @returns parsed value
   */
  parse(
    value?: number | string | boolean | object | null,
    type?: TPinotDataType,
  ): number | string | boolean | object | null | Date | bigint | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    switch (type) {
      case 'INT':
      case 'LONG':
        return typeof value === 'string' ? parseInt(value, 10) : value;
      case 'FLOAT':
      case 'DOUBLE':
      case 'BIG_DECIMAL':
        return typeof value === 'string' ? parseFloat(value) : value;
      case 'BOOLEAN':
        return !!value;
      case 'TIMESTAMP':
        // TODO: needs investigation on how timezones are handled
        return new Date(value as string);
      case 'STRING':
      case 'JSON':
        return value as string;
      case 'BYTES':
        return Buffer.from(value as string, 'hex');
      default:
        return value;
    }
  }
}
