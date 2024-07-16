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
      `'${date.getFullYear()}-${SqlFormat.zeroPad(date.getMonth() + 1, 2)}-${SqlFormat.zeroPad(date.getDate(), 2)} ${SqlFormat.zeroPad(date.getHours(), 2)}:${SqlFormat.zeroPad(date.getMinutes(), 2)}:${SqlFormat.zeroPad(date.getSeconds(), 2)}.${SqlFormat.zeroPad(date.getMilliseconds(), 3)}'`,
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
});
