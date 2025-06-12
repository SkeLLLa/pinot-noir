import * as assert from 'node:assert';
import { describe, test } from 'node:test';
import { IPinotQueryOptions, sql, SqlUtils } from '../src';

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
});
