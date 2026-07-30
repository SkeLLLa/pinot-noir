import type { TPinotDataType } from '../broker-respone.types';
import type { IPinotValueParser } from './types';

/**
 * Safe parser.
 *
 * @public
 * @description
 *
 * Parses the value safely. Longs are casted to big ints.
 */
export class SafeParser implements IPinotValueParser {
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
  ): number | string | boolean | object | null | bigint | Date | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    switch (type) {
      case 'INT':
      case 'FLOAT':
      case 'DOUBLE':
      case 'BIG_DECIMAL':
        return typeof value === 'string' ? parseFloat(value) : value;
      case 'LONG':
        return BigInt(value as string);
      case 'BOOLEAN':
        return !!value;
      case 'TIMESTAMP':
        // TODO: needs investigation on how timezones are handled
        return new Date(value as string);
      case 'STRING':
      case 'JSON':
        return value;
      case 'BYTES':
        return Buffer.from(value as string, 'hex');
      default:
        return value;
    }
  }
}
