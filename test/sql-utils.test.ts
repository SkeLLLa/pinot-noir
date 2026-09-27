import * as assert from 'node:assert';
import { describe, test } from 'node:test';

import type { IPinotQueryOptions } from '../src';
import { empty, sql, SqlUtils } from '../src';

void describe('Sql Utils', async () => {
  await test('generates query with no options', () => {
    const query = sql`SELECT * FROM table WHERE id = ${1}`;

    assert.strictEqual(
      SqlUtils.stringifyQuery(query),
      'SELECT * FROM table WHERE id = 1',
    );
  });

  await test('generates query with options', () => {
    const query = sql`SELECT * FROM table WHERE id = ${1}`;
    const options: IPinotQueryOptions = {
      useMultistageEngine: true,
      timeoutMs: 100,
      inPredicateLookupAlgorithm: 'SCAN',
    };

    assert.strictEqual(
      SqlUtils.stringifyQuery(query, options),
      `SET useMultistageEngine = true;\nSET timeoutMs = 100;\nSET inPredicateLookupAlgorithm = 'SCAN';\nSELECT * FROM table WHERE id = 1`,
    );
  });

  await test('generates query without non-pinot options', () => {
    const query = sql`SELECT * FROM table WHERE id = ${1}`;
    const options: IPinotQueryOptions = {
      useMultistageEngine: true,
      timeoutMs: 100,
      inPredicateLookupAlgorithm: 'SCAN',
      queueTolerance: 0.3,
    };

    assert.strictEqual(
      SqlUtils.stringifyQuery(query, options),
      `SET useMultistageEngine = true;\nSET timeoutMs = 100;\nSET inPredicateLookupAlgorithm = 'SCAN';\nSELECT * FROM table WHERE id = 1`,
    );
  });

  await test('trims indentation from query', () => {
    const query = sql`
      SELECT
        *
      FROM
        table
      WHERE
        id = ${1}
    `;

    assert.strictEqual(
      SqlUtils.stringifyQuery(query),
      `SELECT\n  *\nFROM\n  table\nWHERE\n  id = 1`,
    );
  });

  await test('handles inconsistent indentation in SQL queries', () => {
    const query = sql`
    select * from table
  where a = ${1}
      limit 5  
`;

    const result = SqlUtils.stringifyQuery(query);
    assert.strictEqual(result, 'select * from table\n  where a = 1\n  limit 5');
  });

  await test('empty queries return only options and remove blank lines', () => {
    assert.strictEqual(SqlUtils.stringifyQuery(empty), '');
    assert.strictEqual(SqlUtils.stringifyQuery(sql` \n\t `), '');
    assert.strictEqual(
      SqlUtils.stringifyQuery(empty, { timeoutMs: 0 }),
      'SET timeoutMs = 0;',
    );
    assert.strictEqual(
      SqlUtils.stringifyQuery(sql`\n SELECT 1  \n\n FROM items \n`),
      'SELECT 1\nFROM items',
    );
  });

  await test('option formatting supports absent options and primitive values', () => {
    assert.strictEqual(SqlUtils.formatOptions(), '');
    assert.strictEqual(SqlUtils.formatOptions({}), '');
    assert.strictEqual(SqlUtils.formatOptions({ queueTolerance: 0.5 }), '');
    assert.strictEqual(
      SqlUtils.formatOptions({
        timeoutMs: 0,
        useMultistageEngine: false,
        clientQueryId: '',
      }),
      "SET timeoutMs = 0;\nSET useMultistageEngine = false;\nSET clientQueryId = '';",
    );
    for (const value of [undefined, null, {}, [], () => 'ignored']) {
      assert.strictEqual(
        SqlUtils.formatOptions({
          custom: value,
        } as unknown as IPinotQueryOptions),
        '',
      );
    }
  });
});
