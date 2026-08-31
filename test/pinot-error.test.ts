/* node:coverage disable */
import * as assert from 'node:assert';
import { describe, test } from 'node:test';

import {
  EPinotErrorCategory,
  EPinotErrorType,
  ERROR_CODES,
  getErrorCategory,
  PinotError,
} from '../src/client/errors/pinot';

void describe('getErrorCategory', async () => {
  await test('maps known codes to their category', () => {
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.SQL_PARSING_ERROR_CODE),
      EPinotErrorCategory.VALIDATION,
    );
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.ACCESS_DENIED_ERROR_CODE),
      EPinotErrorCategory.PERMISSION_DENIED,
    );
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE),
      EPinotErrorCategory.TIMEOUT,
    );
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.TOO_MANY_REQUESTS_ERROR_CODE),
      EPinotErrorCategory.RESOURCE_EXHAUSTED,
    );
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.SERVER_NOT_RESPONDING_ERROR_CODE),
      EPinotErrorCategory.UNAVAILABLE,
    );
  });

  await test('defaults unknown codes to QUERY_ERROR', () => {
    assert.strictEqual(getErrorCategory(-1), EPinotErrorCategory.QUERY_ERROR);
    assert.strictEqual(
      getErrorCategory(ERROR_CODES.UNKNOWN_ERROR_CODE),
      EPinotErrorCategory.QUERY_ERROR,
    );
  });
});

void describe('PinotError.category', async () => {
  await test('categorizes based on the single exception errorCode', () => {
    const error = new PinotError({
      message: 'table not found',
      type: EPinotErrorType.SQL,
      exceptions: [
        {
          message: 'nope',
          errorCode: ERROR_CODES.TABLE_DOES_NOT_EXIST_ERROR_CODE,
        },
      ],
    });
    assert.strictEqual(error.category, EPinotErrorCategory.NOT_FOUND);
  });

  await test('falls back to the error code when there are multiple exceptions', () => {
    const error = new PinotError({
      message: 'multiple failures',
      type: EPinotErrorType.SQL,
      code: ERROR_CODES.QUERY_CANCELLATION_ERROR_CODE,
      exceptions: [
        { message: 'a', errorCode: ERROR_CODES.QUERY_EXECUTION_ERROR_CODE },
        { message: 'b', errorCode: ERROR_CODES.INTERNAL_ERROR_CODE },
      ],
    });
    assert.strictEqual(error.category, EPinotErrorCategory.CANCELLED);
  });
});
