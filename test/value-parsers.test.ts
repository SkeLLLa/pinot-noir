/* node:coverage ignore */
import * as assert from 'node:assert';
import { describe, test } from 'node:test';

import { BypassParser } from '../src/client/broker/type-parsers/bypass';
import { SafeParser } from '../src/client/broker/type-parsers/safe';
import { UnsafeParser } from '../src/client/broker/type-parsers/unsafe';

void describe('Value Parsers', async () => {
  await test('UnsafeParser should parse values correctly', () => {
    const parser = new UnsafeParser();
    assert.strictEqual(parser.parse('123', 'INT'), 123);
    assert.strictEqual(parser.parse('123.45', 'FLOAT'), 123.45);
    assert.strictEqual(parser.parse(true, 'BOOLEAN'), true);
    assert.strictEqual(parser.parse(false, 'BOOLEAN'), false);
    assert.strictEqual(
      (parser.parse('2023-01-01T00:00:00Z', 'TIMESTAMP') as Date).toISOString(),
      '2023-01-01T00:00:00.000Z',
    );
    assert.strictEqual(parser.parse('string', 'STRING'), 'string');
    assert.deepStrictEqual(
      parser.parse('68656c6c6f', 'BYTES'),
      Buffer.from('hello', 'utf-8'),
    );
  });

  await test('SafeParser should parse values correctly', () => {
    const parser = new SafeParser();
    assert.strictEqual(parser.parse('123', 'INT'), 123);
    assert.strictEqual(parser.parse('123.45', 'FLOAT'), 123.45);
    assert.strictEqual(parser.parse(true, 'BOOLEAN'), true);
    assert.strictEqual(parser.parse(false, 'BOOLEAN'), false);
    assert.strictEqual(
      (parser.parse('2023-01-01T00:00:00Z', 'TIMESTAMP') as Date).toISOString(),
      '2023-01-01T00:00:00.000Z',
    );
    assert.strictEqual(parser.parse('string', 'STRING'), 'string');
    assert.deepStrictEqual(
      parser.parse('68656c6c6f', 'BYTES'),
      Buffer.from('hello', 'utf-8'),
    );
    assert.strictEqual(
      parser.parse('12345678901234567890', 'LONG'),
      BigInt('12345678901234567890'),
    );
  });

  await test('BypassParser should return values as is', () => {
    const parser = new BypassParser();
    assert.strictEqual(parser.parse('123'), '123');
    assert.strictEqual(parser.parse(123), 123);
    assert.strictEqual(parser.parse(true), true);
    assert.strictEqual(parser.parse(null), null);
    assert.strictEqual(parser.parse(undefined), undefined);
  });
});

for (const Parser of [SafeParser, UnsafeParser]) {
  void describe(`${Parser.name} edge cases`, () => {
    const parser = new Parser();

    void test('preserves absent values before conversion', () => {
      for (const type of ['LONG', 'TIMESTAMP', 'BYTES', 'BOOLEAN'] as const) {
        assert.strictEqual(parser.parse(null, type), null);
        assert.strictEqual(parser.parse(undefined, type), undefined);
      }
      assert.strictEqual(parser.parse(), undefined);
    });

    void test('preserves non-finite FLOAT and DOUBLE results in both wire representations', () => {
      for (const type of ['FLOAT', 'DOUBLE'] as const) {
        for (const value of [Infinity, -Infinity, NaN]) {
          assert.ok(Object.is(parser.parse(value, type), value));
          assert.ok(Object.is(parser.parse(String(value), type), value));
        }
      }
    });

    void test('converts finite numeric strings and retains numeric values', () => {
      for (const type of ['INT', 'FLOAT', 'DOUBLE', 'BIG_DECIMAL'] as const) {
        assert.strictEqual(parser.parse('123', type), 123);
        assert.strictEqual(parser.parse(123, type), 123);
        assert.strictEqual(parser.parse(0, type), 0);
        assert.ok(Number.isNaN(parser.parse('invalid', type)));
      }
      assert.strictEqual(parser.parse('123.45', 'BIG_DECIMAL'), 123.45);
      assert.strictEqual(parser.parse('123.45', 'DOUBLE'), 123.45);
    });

    void test('preserves JSON, arrays and values without a known type', () => {
      const object = { nested: { value: 1 } };
      const array = [1, 2];
      assert.strictEqual(parser.parse(object, 'JSON'), object);
      assert.strictEqual(parser.parse('{"value":1}', 'JSON'), '{"value":1}');
      assert.strictEqual(parser.parse(array), array);
      assert.strictEqual(parser.parse(object), object);
      assert.strictEqual(parser.parse('untyped'), 'untyped');
    });

    void test('converts timestamps and bytes including empty and invalid inputs', () => {
      assert.strictEqual((parser.parse(0, 'TIMESTAMP') as Date).getTime(), 0);
      assert.ok(
        Number.isNaN((parser.parse('invalid', 'TIMESTAMP') as Date).getTime()),
      );
      assert.deepStrictEqual(parser.parse('', 'BYTES'), Buffer.alloc(0));
      assert.deepStrictEqual(
        parser.parse('00ff', 'BYTES'),
        Buffer.from([0, 255]),
      );
      assert.strictEqual(parser.parse(0, 'BOOLEAN'), false);
      assert.strictEqual(parser.parse(1, 'BOOLEAN'), true);
    });
  });
}

void test('LONG parsers expose their documented precision tradeoff', () => {
  const safe = new SafeParser();
  const unsafe = new UnsafeParser();
  assert.strictEqual(safe.parse('9007199254740993', 'LONG'), 9007199254740993n);
  assert.strictEqual(safe.parse(123, 'LONG'), 123n);
  assert.strictEqual(safe.parse('-123', 'LONG'), -123n);
  assert.throws(() => safe.parse('invalid', 'LONG'), SyntaxError);
  assert.throws(() => safe.parse(1.5, 'LONG'), RangeError);
  assert.strictEqual(unsafe.parse('123', 'LONG'), 123);
  assert.strictEqual(unsafe.parse(123, 'LONG'), 123);
  assert.strictEqual(unsafe.parse('-123', 'LONG'), -123);
});

void test('BypassParser preserves object identity and special numeric values', () => {
  const parser = new BypassParser();
  for (const value of [
    { value: 1 },
    [1],
    Buffer.from('a'),
    Infinity,
    -Infinity,
    NaN,
  ]) {
    assert.ok(Object.is(parser.parse(value), value));
  }
  assert.strictEqual(parser.parse(), undefined);
});
