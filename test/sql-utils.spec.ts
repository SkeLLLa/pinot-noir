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
});
