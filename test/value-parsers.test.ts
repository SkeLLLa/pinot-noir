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
      (
        parser.parse('2023-01-01T00:00:00Z', 'TIMESTAMP') as Date
      )?.toISOString() ?? '',
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
      (
        parser.parse('2023-01-01T00:00:00Z', 'TIMESTAMP') as Date
      )?.toISOString() ?? '',
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
