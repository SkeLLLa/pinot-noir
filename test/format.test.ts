/* node:coverage disable */
import * as assert from 'node:assert';
import { describe, test } from 'node:test';

import { SqlFormat } from '../src/utils/format';

void describe('Sql Formatter', async () => {
  await test('escapeId should escape identifiers correctly', () => {
    assert.strictEqual(SqlFormat.escapeId('identifier'), '"identifier"');
    assert.strictEqual(
      SqlFormat.escapeId('identifier.with.dot'),
      '"identifier"."with"."dot"',
    );
    assert.strictEqual(
      SqlFormat.escapeId('identifier"with"quote'),
      '"identifier""with""quote"',
    );
    assert.strictEqual(SqlFormat.escapeId(['id1', 'id2']), '"id1", "id2"');
  });

  await test('escape should handle various data types correctly', () => {
    assert.strictEqual(SqlFormat.escape(null), 'NULL');
    assert.strictEqual(SqlFormat.escape(undefined), 'NULL');
    assert.strictEqual(SqlFormat.escape(true), 'TRUE');
    assert.strictEqual(SqlFormat.escape(false), 'FALSE');
    assert.strictEqual(SqlFormat.escape(123), '123');
    assert.strictEqual(SqlFormat.escape('string'), "'string'");
    assert.strictEqual(
      SqlFormat.escape("string with 'quote'"),
      "'string with ''quote'''",
    );
    assert.strictEqual(
      SqlFormat.escape(new Date('2023-01-01T00:00:00Z'), false, 'Z'),
      "'2023-01-01 00:00:00.000'",
    );
    assert.strictEqual(
      SqlFormat.escape(Buffer.from('buffer')),
      "X'627566666572'",
    );
    assert.strictEqual(SqlFormat.escape([1, 'two', true]), "1, 'two', TRUE");
  });

  await test('arrayToList should convert arrays to SQL lists', () => {
    assert.strictEqual(SqlFormat.arrayToList([1, 2, 3]), '1, 2, 3');
    assert.strictEqual(SqlFormat.arrayToList(['a', 'b', 'c']), "'a', 'b', 'c'");
    assert.strictEqual(SqlFormat.arrayToList([1, [2, 3], 4]), '1, (2, 3), 4');
  });

  await test('format should replace placeholders with escaped values', () => {
    assert.strictEqual(
      SqlFormat.format('SELECT * FROM table WHERE id = ?', [1]),
      'SELECT * FROM table WHERE id = 1',
    );
    assert.strictEqual(
      SqlFormat.format('SELECT * FROM table WHERE name = ?', ['name']),
      "SELECT * FROM table WHERE name = 'name'",
    );
    assert.strictEqual(
      SqlFormat.format('SELECT * FROM table WHERE id = ? AND name = ?', [
        1,
        'name',
      ]),
      "SELECT * FROM table WHERE id = 1 AND name = 'name'",
    );
    assert.strictEqual(
      SqlFormat.format('SELECT * FROM table WHERE id = ? AND name = ?', [1]),
      'SELECT * FROM table WHERE id = 1 AND name = ?',
    );
  });

  await test('dateToString should format dates correctly', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    assert.strictEqual(
      SqlFormat.dateToString(date, 'Z'),
      "'2023-01-01 00:00:00.000'",
    );
    assert.strictEqual(
      SqlFormat.dateToString(date, 'local'),
      `'${date.getFullYear().toString()}-${SqlFormat.zeroPad(date.getMonth() + 1, 2)}-${SqlFormat.zeroPad(date.getDate(), 2)} ${SqlFormat.zeroPad(date.getHours(), 2)}:${SqlFormat.zeroPad(date.getMinutes(), 2)}:${SqlFormat.zeroPad(date.getSeconds(), 2)}.${SqlFormat.zeroPad(date.getMilliseconds(), 3)}'`,
    );
  });

  await test('bufferToString should convert buffers to hex strings', () => {
    assert.strictEqual(
      SqlFormat.bufferToString(Buffer.from('buffer')),
      "X'627566666572'",
    );
  });

  await test('objectToValues should convert objects to SQL key-value pairs', () => {
    assert.strictEqual(
      SqlFormat.objectToValues({ id: 1, name: 'name' }),
      '"id" = 1, "name" = \'name\'',
    );
    assert.strictEqual(
      SqlFormat.objectToValues({ id: 1, active: true }),
      '"id" = 1, "active" = TRUE',
    );
  });

  await test('raw should return an object with toSqlFormat method', () => {
    const rawSql = SqlFormat.raw('SELECT 1');
    assert.strictEqual(rawSql.toSqlFormat(), 'SELECT 1');
  });

  await test('identifiers support qualification control and empty lists', () => {
    assert.strictEqual(SqlFormat.escapeId('a.b"c', true), '"a.b""c"');
    assert.strictEqual(SqlFormat.escapeId(['a.b', 'c'], true), '"a.b", "c"');
    assert.strictEqual(SqlFormat.escapeId([]), '');
    assert.strictEqual(SqlFormat.escapeId(''), '""');
  });

  await test('string escaping covers control characters and repeated calls', () => {
    const cases: [string, string][] = [
      ['', "''"],
      ['\0', "'\\0'"],
      ['\b', "'\\b'"],
      ['\t', "'\\t'"],
      ['\n', "'\\n'"],
      ['\r', "'\\r'"],
      ['\x1a', "'\\Z'"],
      ['"', '\'""\''],
      ["'", "''''"],
      ['\\', "'\\\\'"],
      ["a'b", "'a''b'"],
      ['日本語😀', "'日本語😀'"],
    ];
    for (let repeat = 0; repeat < 2; repeat++) {
      for (const [input, expected] of cases) {
        assert.strictEqual(SqlFormat.escape(input), expected);
      }
    }
  });

  await test('formats explicit object assignments and custom string values', () => {
    assert.strictEqual(SqlFormat.escape({ id: 3 }), '"id" = 3');
    assert.strictEqual(
      SqlFormat.escape({ toString: () => "a'b" }, true),
      "'a''b'",
    );
    assert.strictEqual(SqlFormat.objectToValues({}), '');
    assert.strictEqual(
      SqlFormat.objectToValues({
        'a"b': null,
        'ignored': () => 1,
        'nested': { id: 1 },
      }),
      '"a""b" = NULL, "nested" = \'[object Object]\'',
    );
    assert.strictEqual(SqlFormat.escape(SqlFormat.raw('NOW()')), 'NOW()');
    assert.throws(() => SqlFormat.raw(1 as unknown as string), TypeError);
  });

  await test('lists preserve nesting and serialize nulls, dates and binary values', () => {
    assert.strictEqual(SqlFormat.arrayToList([]), '');
    assert.strictEqual(
      SqlFormat.arrayToList(
        [
          null,
          [undefined, Buffer.from([0, 255])],
          new Date('2024-02-29T23:59:59.123Z'),
        ],
        'Z',
      ),
      "NULL, (NULL, X'00ff'), '2024-02-29 23:59:59.123'",
    );
    assert.strictEqual(SqlFormat.bufferToString(Buffer.alloc(0)), "X''");
  });

  await test('legacy formatting supports identifiers and absent or scalar values', () => {
    assert.strictEqual(SqlFormat.format('SELECT ?', null), 'SELECT ?');
    assert.strictEqual(SqlFormat.format('SELECT ?', undefined), 'SELECT ?');
    assert.strictEqual(SqlFormat.format('SELECT ?', []), 'SELECT ?');
    assert.strictEqual(SqlFormat.format('SELECT 1', [2]), 'SELECT 1');
    assert.strictEqual(
      SqlFormat.format('SELECT ?', 2 as unknown as unknown[]),
      'SELECT 2',
    );
    assert.strictEqual(
      SqlFormat.format('SELECT ?? FROM ?? WHERE id = ?', [
        ['a', 'b'],
        'schema.table',
        7,
      ]),
      'SELECT "a", "b" FROM "schema"."table" WHERE id = 7',
    );
    assert.strictEqual(
      SqlFormat.format('SELECT ???, ?;', [7]),
      'SELECT ???, 7;',
    );
    assert.strictEqual(
      SqlFormat.format('SELECT ?', [{ toString: () => 'scalar' }], true),
      "SELECT 'scalar'",
    );
    assert.strictEqual(
      SqlFormat.format(
        'SELECT ?',
        [new Date('2024-01-01T00:00:00Z')],
        false,
        '+02',
      ),
      "SELECT '2024-01-01 02:00:00.000'",
    );
  });

  await test('date formatting handles offsets, rollovers and invalid dates without mutation', () => {
    const date = new Date('2024-01-01T00:15:20.007Z');
    const instant = date.getTime();
    const cases: [string, string][] = [
      ['+05:30', "'2024-01-01 05:45:20.007'"],
      ['-0230', "'2023-12-31 21:45:20.007'"],
      ['+02', "'2024-01-01 02:15:20.007'"],
      ['+00:00', "'2024-01-01 00:15:20.007'"],
      ['invalid', "'2024-01-01 00:15:20.007'"],
    ];
    for (const [timezone, expected] of cases) {
      assert.strictEqual(SqlFormat.dateToString(date, timezone), expected);
      assert.strictEqual(date.getTime(), instant);
    }
    assert.strictEqual(
      SqlFormat.escape(date),
      SqlFormat.dateToString(date, 'local'),
    );
    assert.strictEqual(SqlFormat.dateToString(new Date(NaN), 'Z'), 'NULL');
    assert.strictEqual(SqlFormat.zeroPad(5, 3), '005');
    assert.strictEqual(SqlFormat.zeroPad(1234, 2), '1234');
  });
});
