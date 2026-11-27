/* node:coverage disable */
import * as assert from 'node:assert';
import { describe, test } from 'node:test';

import { EBrokerTransportErrorCode } from '../src/client/broker/transport/types';
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
      getErrorCategory(ERROR_CODES.WORKLOAD_BUDGET_EXCEEDED_ERROR_CODE),
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

void describe('PinotError construction and parsing', () => {
  void test('defaults to an unknown error while retaining standard Error behavior', () => {
    const error = new PinotError({ message: 'failed' });
    assert.ok(error instanceof Error);
    assert.strictEqual(error.name, 'PinotError');
    assert.strictEqual(error.message, 'failed');
    assert.strictEqual(error.type, EPinotErrorType.UNKNOWN);
    assert.strictEqual(error.code, 0);
    assert.strictEqual(error.category, EPinotErrorCategory.QUERY_ERROR);
    assert.strictEqual(error.cause, undefined);
    assert.strictEqual(error.data, undefined);
    assert.strictEqual(error.exceptions, undefined);
  });

  void test('preserves cause and typed data and honors an explicit error code', () => {
    const cause = new Error('underlying');
    const data = { request: 'test' };
    const exceptions = [
      { message: 'denied', errorCode: ERROR_CODES.ACCESS_DENIED_ERROR_CODE },
    ];
    const error = new PinotError({
      message: 'failed',
      type: EPinotErrorType.SQL,
      code: ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE,
      cause,
      data,
      exceptions,
    });
    assert.strictEqual(error.code, 2400);
    assert.strictEqual(error.cause, cause);
    assert.strictEqual(error.data, data);
    assert.strictEqual(error.exceptions, exceptions);
    assert.strictEqual(error.category, EPinotErrorCategory.PERMISSION_DENIED);
  });

  void test('derives codes from one exception and uses explicit codes for empty exceptions', () => {
    const derived = new PinotError({
      message: 'failed',
      type: EPinotErrorType.SQL,
      exceptions: [
        { message: 'denied', errorCode: ERROR_CODES.ACCESS_DENIED_ERROR_CODE },
      ],
    });
    assert.strictEqual(derived.code, 2180);
    const empty = new PinotError({
      message: 'failed',
      type: EPinotErrorType.SQL,
      code: ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE,
      exceptions: [],
    });
    assert.strictEqual(empty.code, 2400);
    assert.strictEqual(empty.category, EPinotErrorCategory.TIMEOUT);
  });

  void test('decodes type and broker code across error domains', () => {
    for (const type of [
      EPinotErrorType.UNKNOWN,
      EPinotErrorType.TRANSPORT,
      EPinotErrorType.SQL,
      EPinotErrorType.PARSE,
    ]) {
      const error = new PinotError({
        message: 'failed',
        type,
        code: ERROR_CODES.SQL_PARSING_ERROR_CODE,
      });
      assert.deepStrictEqual(PinotError.parseErrorCode(error.code), {
        type,
        errorCode: ERROR_CODES.SQL_PARSING_ERROR_CODE,
      });
    }
    assert.deepStrictEqual(PinotError.parseErrorCode(0), {
      type: EPinotErrorType.UNKNOWN,
      errorCode: 0,
    });
  });
});

void test('every published broker error code has the expected category', () => {
  const groups: [EPinotErrorCategory, number[]][] = [
    [EPinotErrorCategory.VALIDATION, [100, 150, 155, 700, 710]],
    [EPinotErrorCategory.PERMISSION_DENIED, [180]],
    [EPinotErrorCategory.NOT_FOUND, [190, 191]],
    [EPinotErrorCategory.TIMEOUT, [240, 250, 400]],
    [EPinotErrorCategory.RESOURCE_EXHAUSTED, [211, 245, 246, 429, 430]],
    [EPinotErrorCategory.CANCELLED, [503]],
    [
      EPinotErrorCategory.UNAVAILABLE,
      [210, 230, 235, 305, 410, 420, 425, 427, 510],
    ],
    [EPinotErrorCategory.QUERY_ERROR, [160, 200, 450, 500, 720, 1000]],
  ];
  const tested = new Set<number>();
  for (const [category, codes] of groups) {
    for (const code of codes) {
      assert.strictEqual(getErrorCategory(code), category, `code ${code}`);
      tested.add(code);
    }
  }
  assert.deepStrictEqual(
    tested,
    new Set(
      Object.values(ERROR_CODES).filter((code) => typeof code === 'number'),
    ),
  );
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

void describe('PinotError.category by error type', async () => {
  const cases: [
    string,
    ConstructorParameters<typeof PinotError>[0],
    EPinotErrorCategory,
  ][] = [
    [
      'queue limit',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.QUEUE_TOLERANCE_LIMIT,
        message: '',
      },
      EPinotErrorCategory.RESOURCE_EXHAUSTED,
    ],
    [
      'timeout',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.TIMEOUT,
        message: '',
      },
      EPinotErrorCategory.TIMEOUT,
    ],
    [
      'connection failure',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.UNKNOWN,
        message: '',
      },
      EPinotErrorCategory.UNAVAILABLE,
    ],
    [
      'HTTP 429',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        data: { statusCode: 429 },
        message: '',
      },
      EPinotErrorCategory.RESOURCE_EXHAUSTED,
    ],
    [
      'HTTP 502',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        data: { statusCode: 502 },
        message: '',
      },
      EPinotErrorCategory.UNAVAILABLE,
    ],
    [
      'HTTP 503',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        data: { statusCode: 503 },
        message: '',
      },
      EPinotErrorCategory.UNAVAILABLE,
    ],
    [
      'HTTP 504',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        data: { statusCode: 504 },
        message: '',
      },
      EPinotErrorCategory.UNAVAILABLE,
    ],
    [
      'HTTP 403',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        data: { statusCode: 403 },
        message: '',
      },
      EPinotErrorCategory.QUERY_ERROR,
    ],
    [
      'unparsable 2xx',
      {
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        message: '',
      },
      EPinotErrorCategory.QUERY_ERROR,
    ],
    [
      'parse error',
      {
        type: EPinotErrorType.PARSE,
        code: ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE,
        message: '',
      },
      EPinotErrorCategory.QUERY_ERROR,
    ],
    [
      'unknown error',
      { code: ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE, message: '' },
      EPinotErrorCategory.QUERY_ERROR,
    ],
  ];
  for (const [name, args, category] of cases) {
    await test(name, () => {
      assert.strictEqual(new PinotError(args).category, category);
    });
  }
});
