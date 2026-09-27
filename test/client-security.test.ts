/* node:coverage disable */
import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'undici';

import {
  sql,
  type IPinotBrokerTransport,
  type IPinotQueryOptions,
} from '../src';
import { PinotClient } from '../src/client/broker/broker-client';
import { PinotBrokerJSONTransport } from '../src/client/broker/transport/json/undici';

class InspectableTransport extends PinotBrokerJSONTransport {
  get testPool(): Pool {
    return this.pool;
  }
}

void test('a zero queue tolerance permits idle requests but rejects a waiting queue', async (t) => {
  const transport = new InspectableTransport({
    brokerUrl: 'http://broker.pinot.invalid',
    token: 'test',
    maxQueueSize: 10,
  });
  t.after(() => transport.close());
  let queued = 0;
  t.mock.getter(transport.testPool, 'stats', () => ({ queued }));
  const dispatch = t.mock.method(transport.testPool, 'request', () =>
    Promise.resolve({
      body: { json: () => Promise.resolve({}) },
    }),
  );
  const request = {
    method: 'POST' as const,
    path: '/query/sql',
    options: { queueTolerance: 0 },
  };
  assert.deepEqual(await transport.request(request), {});
  queued = 1;
  await assert.rejects(transport.request(request), /Max queue size reached/);
  assert.equal(dispatch.mock.callCount(), 1);
});

void test('invalid queue tolerances are rejected before dispatch', async (t) => {
  const transport = new InspectableTransport({
    brokerUrl: 'http://broker.pinot.invalid',
    token: 'test',
    maxQueueSize: 10,
  });
  t.after(() => transport.close());
  const dispatch = t.mock.method(transport.testPool, 'request', () =>
    Promise.resolve({
      body: { json: () => Promise.resolve({}) },
    }),
  );
  for (const queueTolerance of [NaN, Infinity, -1]) {
    await assert.rejects(
      transport.request({
        method: 'POST',
        path: '/query/sql',
        options: { queueTolerance },
      }),
      TypeError,
    );
  }
  assert.equal(dispatch.mock.callCount(), 0);
});

void test('an explicitly unlimited queue still accepts a zero tolerance', async (t) => {
  const transport = new InspectableTransport({
    brokerUrl: 'http://broker.pinot.invalid',
    token: 'test',
    maxQueueSize: 0,
  });
  t.after(() => transport.close());
  const dispatch = t.mock.method(transport.testPool, 'request', () =>
    Promise.resolve({ body: { json: () => Promise.resolve({ ok: true }) } }),
  );
  assert.deepEqual(
    await transport.request({
      method: 'POST',
      path: '/query/sql',
      options: { queueTolerance: 0 },
    }),
    { ok: true },
  );
  assert.equal(dispatch.mock.callCount(), 1);
});

void test('query options reject structural delimiters before dispatch', async () => {
  for (const options of [
    { applicationName: 'app;timeoutMs=0' },
    { applicationName: 'app=value' },
    { skipIndexes: 'col1=inverted,range&col2=inverted' },
    { 'applicationName;timeoutMs': '0' },
    { 'applicationName=app;timeoutMs': '0' },
  ]) {
    let calls = 0;
    const transport = {
      request: () => {
        calls++;
        return Promise.reject(new Error('unexpected dispatch'));
      },
    } as unknown as IPinotBrokerTransport;
    const client = new PinotClient({ transport });
    await assert.rejects(client.select(sql`SELECT 1`, options), TypeError);
    assert.equal(calls, 0);
  }
});

void test('query options preserve scalar values and omit undefined options', () => {
  assert.equal(
    PinotClient.toQueryOptions({
      applicationName: 'app&worker,primary',
      clientQueryId: 'query-1',
      timeoutMs: undefined,
      useMultistageEngine: false,
      queueTolerance: 0.1,
    } as unknown as IPinotQueryOptions),
    'applicationName=app&worker,primary;clientQueryId=query-1;useMultistageEngine=false',
  );
});

void test('REST query options preserve custom names while rejecting ambiguous names', () => {
  assert.equal(
    PinotClient.toQueryOptions({
      'custom.option': 'enabled',
      '_custom': true,
      'x-feature': 3,
    } as IPinotQueryOptions),
    'custom.option=enabled;_custom=true;x-feature=3',
  );
  for (const key of ['', ' ', ' timeoutMs', 'timeoutMs ', 'a=b', 'a;b']) {
    assert.throws(
      () => PinotClient.toQueryOptions({ [key]: 1 }),
      /Invalid Pinot query option name/,
    );
  }
});

void test('structured option values use SQL SET instead of the request option delimiter format', async () => {
  const skipIndexes = 'col1=inverted,range&col2=inverted';
  assert.throws(
    () => PinotClient.toQueryOptions({ skipIndexes }),
    /use a SQL SET statement/,
  );
  let requestBody: unknown;
  const transport = {
    request: ({ body }: { body: unknown }) => {
      requestBody = body;
      return Promise.resolve({
        resultTable: {
          dataSchema: { columnNames: [], columnDataTypes: [] },
          rows: [],
        },
      });
    },
  } as unknown as IPinotBrokerTransport;
  await new PinotClient({ transport }).select(
    sql`SET skipIndexes = ${skipIndexes}; SELECT * FROM items`,
  );
  assert.deepEqual(JSON.parse(String(requestBody)), {
    sql: "SET skipIndexes = 'col1=inverted,range&col2=inverted'; SELECT * FROM items",
  });
});

void test('query options reject non-scalar runtime values without coercion', () => {
  let coerced = false;
  const value = {
    toString: () => {
      coerced = true;
      return 'app;timeoutMs=0';
    },
  };
  for (const invalid of [value, [], null, NaN, Infinity]) {
    assert.throws(
      () =>
        PinotClient.toQueryOptions({
          applicationName: invalid,
        } as unknown as IPinotQueryOptions),
      TypeError,
    );
  }
  assert.equal(coerced, false);
});

void test('result column names remain own data properties', async () => {
  const payload = { elevated: true };
  const transport = {
    request: () =>
      Promise.resolve({
        exceptions: [],
        resultTable: {
          dataSchema: {
            columnNames: ['__proto__', 'constructor', 'toString', 'ordinary'],
            columnDataTypes: ['JSON', 'STRING', 'STRING', 'STRING'],
          },
          rows: [
            [payload, 'constructor value', 'string value', 'ordinary value'],
          ],
        },
      }),
  } as unknown as IPinotBrokerTransport;
  const { rows } = await new PinotClient({ transport }).select<
    Record<string, unknown>
  >(sql`SELECT 1`);
  const row = rows[0]!;
  assert.equal(Object.getPrototypeOf(row), Object.prototype);
  assert.equal(Object.hasOwn(row, '__proto__'), true);
  assert.deepEqual(row['__proto__'], payload);
  assert.equal(row['elevated'], undefined);
  assert.equal(row['constructor'], 'constructor value');
  assert.equal(row['toString'], 'string value');
  assert.equal(row['ordinary'], 'ordinary value');
  assert.equal(JSON.parse(JSON.stringify(row))['__proto__'].elevated, true);
});

void test('row construction preserves duplicate columns and bypasses inherited property restrictions', async (t) => {
  const setterColumn = '__pinot_test_setter__';
  const readonlyColumn = '__pinot_test_readonly__';
  // eslint-disable-next-line no-extend-native -- Deliberate inherited setter fixture, removed after the test.
  Object.defineProperty(Object.prototype, setterColumn, {
    set: () => {
      throw new Error('An inherited setter must not receive result data');
    },
    configurable: true,
  });
  // eslint-disable-next-line no-extend-native -- Deliberate inherited readonly fixture, removed after the test.
  Object.defineProperty(Object.prototype, readonlyColumn, {
    value: 'inherited',
    writable: false,
    configurable: true,
  });
  t.after(() => {
    Reflect.deleteProperty(Object.prototype, setterColumn);
    Reflect.deleteProperty(Object.prototype, readonlyColumn);
  });
  const transport = {
    request: () =>
      Promise.resolve({
        resultTable: {
          dataSchema: {
            columnNames: ['id', setterColumn, readonlyColumn, 'id'],
            columnDataTypes: ['STRING', 'STRING', 'STRING', 'STRING'],
          },
          rows: [
            ['first', 'setter value', 'own value', 'last'],
            ['other first', 'other setter', 'other own', 'other last'],
          ],
        },
      }),
  } as unknown as IPinotBrokerTransport;
  const { rows } = await new PinotClient({ transport }).select<
    Record<string, unknown>
  >(sql`SELECT 1`);
  assert.deepEqual(rows, [
    {
      id: 'last',
      [setterColumn]: 'setter value',
      [readonlyColumn]: 'own value',
    },
    {
      id: 'other last',
      [setterColumn]: 'other setter',
      [readonlyColumn]: 'other own',
    },
  ]);
  for (const row of rows) {
    assert.equal(Object.getPrototypeOf(row), Object.prototype);
    for (const key of ['id', setterColumn, readonlyColumn] as const) {
      assert.deepEqual(Object.getOwnPropertyDescriptor(row, key), {
        value: row[key],
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  rows[0]!['id'] = 'changed';
  assert.equal(rows[1]!['id'], 'other last');
});
