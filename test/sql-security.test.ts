import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { IPinotBrokerTransport, IPinotQueryOptions } from '../src';
import { bulk, join, raw, sql, SqlUtils } from '../src';
import { PinotClient } from '../src/client/broker/broker-client';
import { SqlFormat } from '../src/utils/format';

// Explicit expected literals keep the regression oracle independent of the
// formatter implementation. Each pair is exercised through several APIs.
const literalCases: readonly (readonly [string, string])[] = [
  ["'", "''''"],
  ["x' OR 1=1 --", "'x'' OR 1=1 --'"],
  ["'; SELECT 2; /*", "'''; SELECT 2; /*'"],
  ['/* ? */ -- ?', "'/* ? */ -- ?'"],
  ['? ?? ???', "'? ?? ???'"],
  ['a"b', '\'a""b\''],
  [String.raw`back\slash`, String.raw`'back\\slash'`],
  [String.raw`\'; --`, String.raw`'\\''; --'`],
  ['東京😀’', "'東京😀’'"],
  ['line\nnext\r\tend', String.raw`'line\nnext\r\tend'`],
  ['\0\x1a', String.raw`'\0\Z'`],
];

void describe('SQL serialization security', async () => {
  await test('queries without parameters preserve trusted SQL verbatim and still validate structure', () => {
    const text = `SELECT '?', "?" /* ? */ -- ?\nFROM items`;
    assert.equal(SqlFormat.formatQuery(raw(text)), text);
    assert.equal(SqlFormat.formatQuery(sql``), '');
    const invalid = sql`SELECT 1`;
    invalid.strings.push('extra');
    assert.throws(() => SqlFormat.formatQuery(invalid), /Invalid SQL template/);
  });

  await test('literal question marks never consume template values', () => {
    const value = "x' OR 1=1 --";
    const query = sql`SELECT '?', "?" FROM items /* ? */ WHERE name = ${value} -- ?`;
    assert.equal(
      SqlFormat.formatQuery(query),
      `SELECT '?', "?" FROM items /* ? */ WHERE name = 'x'' OR 1=1 --' -- ?`,
    );
    assert.equal(SqlUtils.stringifyQuery(query), SqlFormat.formatQuery(query));
  });

  await test('format skips quoted and commented placeholders', () => {
    assert.equal(
      SqlFormat.format(`SELECT '?', "?", \`?\` /* ? */ -- ?\nWHERE name = ?`, [
        "a'b",
      ]),
      `SELECT '?', "?", \`?\` /* ? */ -- ?\nWHERE name = 'a''b'`,
    );
  });

  await test('interpolations inside quoted text and comments fail closed', () => {
    const value = "x' OR 1=1 --";
    const queries = [
      sql`SELECT '${value}'`,
      sql`SELECT "${value}"`,
      sql`SELECT \`${value}\``,
      sql`SELECT 1 -- ${value}\n`,
      sql`SELECT 1 /* ${value} */`,
      sql`SELECT '${value}`,
      sql`SELECT 1 /* ${value}`,
    ];
    for (const query of queries) {
      assert.throws(() => SqlFormat.formatQuery(query), TypeError);
      assert.throws(() => SqlUtils.stringifyQuery(query), TypeError);
    }
  });

  await test('adjacent values retain their boundaries instead of becoming identifiers', () => {
    assert.equal(
      SqlFormat.formatQuery(sql`SELECT ${"a'"}${"b'"}`),
      "SELECT 'a''''b'''",
    );
  });

  await test('JSON objects cannot change a scalar value into an expression', () => {
    const value: unknown = JSON.parse('{"password":1}');
    assert.equal(
      SqlFormat.formatQuery(sql`SELECT * FROM items WHERE password = ${value}`),
      "SELECT * FROM items WHERE password = '[object Object]'",
    );
  });

  await test('nested fragments, lists, bulk values and trusted raw remain supported', () => {
    const filter = sql`name IN (${join(["a'b", 'c'])})`;
    assert.equal(
      SqlFormat.formatQuery(
        sql`SELECT ${raw('count(*)')} FROM items WHERE ${filter}`,
      ),
      "SELECT count(*) FROM items WHERE name IN ('a''b','c')",
    );
    assert.equal(
      SqlFormat.formatQuery(
        sql`VALUES ${bulk([
          [1, 'a'],
          [2, 'b'],
        ])}`,
      ),
      "VALUES (1,'a'),(2,'b')",
    );
    assert.equal(
      SqlFormat.escape(SqlFormat.raw('CURRENT_TIMESTAMP')),
      'CURRENT_TIMESTAMP',
    );
  });

  await test('nonfinite numeric values cannot become SQL expressions', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(
        () => SqlFormat.formatQuery(sql`SELECT ${value}`),
        TypeError,
      );
      assert.throws(
        () => SqlUtils.formatOptions({ timeoutMs: value }),
        TypeError,
      );
    }
  });

  await test('SET option values remain quoted and option names are validated', () => {
    assert.equal(
      SqlUtils.formatOptions({
        customOption: "x'; SELECT 1; --",
      } as IPinotQueryOptions),
      "SET customOption = 'x''; SELECT 1; --';",
    );
    for (const key of ['x = 1; SELECT 1; --', 'x\nSET y', 'x.y', 'x"']) {
      assert.throws(
        () => SqlUtils.formatOptions({ [key]: 'value' }),
        TypeError,
      );
    }
  });

  await test('mutated template structure is rejected before rendering', () => {
    const query = sql`SELECT ${1}`;
    query.values.push(2);
    assert.throws(() => SqlFormat.formatQuery(query), /Invalid SQL template/);
  });

  await test('escaped delimiters and completed comments preserve following boundaries', () => {
    const query = sql`SELECT 'it''s ?', "a""?", \`a\`\`?\` /* ? */ ${1} -- ?\r\n, ${2}`;
    assert.equal(
      SqlFormat.formatQuery(query),
      `SELECT 'it''s ?', "a""?", \`a\`\`?\` /* ? */ 1 -- ?\r\n, 2`,
    );
    assert.equal(
      SqlFormat.formatQuery(sql`SELECT ?, ${3}, ${4}`),
      'SELECT ?, 3, 4',
    );
    assert.equal(SqlFormat.formatQuery(sql`SELECT 1`), 'SELECT 1');
    assert.equal(SqlFormat.formatQuery(sql``), '');
  });

  await test('adversarial scalar literals have exact stable output across serialization APIs', () => {
    for (let repeat = 0; repeat < 3; repeat++) {
      for (const [value, literal] of literalCases) {
        const query = sql`SELECT ${value} AS value, ${17} AS marker`;
        const expected = `SELECT ${literal} AS value, 17 AS marker`;
        assert.equal(SqlFormat.escape(value), literal);
        assert.equal(
          SqlFormat.format('SELECT ? AS value, ? AS marker', [value, 17]),
          expected,
        );
        assert.equal(SqlFormat.formatQuery(query), expected);
        assert.equal(SqlUtils.stringifyQuery(query), expected);
        assert.equal(
          SqlUtils.formatOptions({ clientQueryId: value }),
          `SET clientQueryId = ${literal};`,
        );
      }
    }
  });

  await test('adversarial list, nested fragment and bulk values stay in their own literal positions', () => {
    for (const [value, literal] of literalCases) {
      assert.equal(
        SqlFormat.formatQuery(
          sql`SELECT * FROM items WHERE name IN (${[value, 'sentinel']})`,
        ),
        `SELECT * FROM items WHERE name IN (${literal}, 'sentinel')`,
      );
      assert.equal(
        SqlFormat.formatQuery(
          sql`SELECT * FROM items WHERE name IN (${join([value, 'sentinel'])})`,
        ),
        `SELECT * FROM items WHERE name IN (${literal},'sentinel')`,
      );
      const condition = sql`name = ${value} AND id = ${7}`;
      const nested = sql`(${condition})`;
      assert.equal(
        SqlFormat.formatQuery(sql`SELECT * FROM items WHERE ${nested}`),
        `SELECT * FROM items WHERE (name = ${literal} AND id = 7)`,
      );
      assert.equal(
        SqlFormat.formatQuery(
          sql`VALUES ${bulk([
            [value, 1],
            ['sentinel', 2],
          ])}`,
        ),
        `VALUES (${literal},1),('sentinel',2)`,
      );
      assert.equal(
        SqlFormat.arrayToList([
          [value, null],
          ['sentinel', true],
        ]),
        `(${literal}, NULL), ('sentinel', TRUE)`,
      );
    }
  });

  await test('identifier delimiters cannot become executable text', () => {
    const identifiers: readonly (readonly [string, string])[] = [
      ['col" FROM items; --', '"col"" FROM items; --"'],
      ['schema.col"name', '"schema"."col""name"'],
      ['? /* */ --', '"? /* */ --"'],
      ["x' OR 1=1", '"x\' OR 1=1"'],
      ['東京😀', '"東京😀"'],
    ];
    for (const [identifier, escaped] of identifiers) {
      assert.equal(SqlFormat.escapeId(identifier), escaped);
      assert.equal(
        SqlFormat.format('SELECT ?? FROM items WHERE name = ?', [
          identifier,
          "a'b",
        ]),
        `SELECT ${escaped} FROM items WHERE name = 'a''b'`,
      );
      assert.equal(
        SqlFormat.format('SELECT ?? FROM items', [[identifier, 'sentinel']]),
        `SELECT ${escaped}, "sentinel" FROM items`,
      );
    }
    assert.equal(
      SqlFormat.escapeId('schema.col"name', true),
      '"schema.col""name"',
    );
  });

  await test('all value shapes are rejected in unsafe interpolation contexts', () => {
    const contexts: readonly (readonly [string, string])[] = [
      ["SELECT '", "'"],
      ['SELECT "', '"'],
      ['SELECT `', '`'],
      ["SELECT 'a''", "'"],
      ['SELECT "a""', '"'],
      ['SELECT `a``', '`'],
      ['SELECT 1 -- ', '\n'],
      ['SELECT 1 -- ', '\r\n'],
      ['SELECT 1 /* ', ' */'],
      ["SELECT '", ''],
      ['SELECT "', ''],
      ['SELECT `', ''],
      ['SELECT 1 /* ', ''],
    ];
    for (const value of [
      null,
      1,
      false,
      '',
      ...literalCases.map(([payload]) => payload),
    ]) {
      for (const [prefix, suffix] of contexts) {
        const query = sql([prefix, suffix], value);
        assert.throws(
          () => SqlFormat.formatQuery(query),
          /outside quoted text and comments/,
        );
        assert.throws(() => SqlUtils.stringifyQuery(query), TypeError);
      }
    }
  });

  await test('legacy formatting skips complete and incomplete lexical contexts on repeated calls', () => {
    const source = `SELECT '?', 'a''?', "a""?", \`a\`\`?\`, ? /* ?? */ -- ?\r\n, ??, ?`;
    const expected = `SELECT '?', 'a''?', "a""?", \`a\`\`?\`, 'a''b' /* ?? */ -- ?\r\n, "col""name", 9`;
    for (let repeat = 0; repeat < 3; repeat++) {
      assert.equal(SqlFormat.format(source, ["a'b", 'col"name', 9]), expected);
      for (const tail of [
        "'unfinished ?",
        '"unfinished ?',
        '`unfinished ?',
        '/* unfinished ?',
        '-- unfinished ?',
      ]) {
        const query = `SELECT ? AS marker, ${tail}`;
        assert.equal(
          SqlFormat.format(query, [7, "x' OR 1=1"]),
          `SELECT 7 AS marker, ${tail}`,
        );
      }
    }
  });

  await test('trusted raw fragments do not disable escaping or lexical checks for adjacent values', () => {
    for (const [value, literal] of literalCases) {
      assert.equal(
        SqlFormat.formatQuery(
          sql`SELECT ${raw('COALESCE(')}${value}${raw(', NULL)')}`,
        ),
        `SELECT COALESCE(${literal}, NULL)`,
      );
      assert.equal(
        SqlFormat.formatQuery(sql`SELECT ${raw("'?' AS marker,")} ${value}`),
        `SELECT '?' AS marker, ${literal}`,
      );
      assert.throws(
        () => SqlFormat.formatQuery(sql`SELECT ${raw("'")}${value}${raw("'")}`),
        TypeError,
      );
      assert.throws(
        () =>
          SqlFormat.formatQuery(sql`SELECT 1 ${raw('/*')}${value}${raw('*/')}`),
        TypeError,
      );
    }
    assert.equal(
      SqlFormat.formatQuery(sql`SELECT ${raw('1 + 2')}`),
      'SELECT 1 + 2',
    );
    assert.equal(
      SqlFormat.formatQuery(sql`SELECT ${'1 + 2'}`),
      "SELECT '1 + 2'",
    );
  });

  await test('actual broker dispatch serializes the same protected SQL for every payload', async () => {
    const requests: string[] = [];
    const transport = {
      request: (options: { body: string }) => {
        requests.push(options.body);
        return Promise.resolve({
          exceptions: [],
          resultTable: {
            dataSchema: { columnNames: [], columnDataTypes: [] },
            rows: [],
          },
        });
      },
    } as unknown as IPinotBrokerTransport;
    const client = new PinotClient({ transport });
    for (const [value, literal] of literalCases) {
      const query = sql`SELECT '?' AS marker FROM items WHERE name IN (${join([value, 'sentinel'])}) AND id = ${3} /* ? */`;
      const expected = `SELECT '?' AS marker FROM items WHERE name IN (${literal},'sentinel') AND id = 3 /* ? */`;
      const result = await client.select(query);
      assert.equal(result.sql, expected);
      assert.deepEqual(JSON.parse(requests.at(-1)!), { sql: expected });
    }
    assert.equal(requests.length, literalCases.length);
    for (const query of [
      sql`SELECT '${'payload'}'`,
      sql`SELECT 1 -- ${'payload'}`,
      sql`SELECT 1 /* ${'payload'} */`,
    ]) {
      await assert.rejects(client.select(query), TypeError);
    }
    assert.equal(requests.length, literalCases.length);
  });
});
