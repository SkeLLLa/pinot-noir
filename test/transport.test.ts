/* node:coverage disable */
import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { errors, type Pool, type Dispatcher } from 'undici';

import { PinotBrokerJSONTransport } from '../src/client/broker/transport/json/undici';
import { EBrokerTransportErrorCode } from '../src/client/broker/transport/types';
import { EPinotErrorType, PinotError } from '../src/client/errors/pinot';

class TestTransport extends PinotBrokerJSONTransport {
  get testPool(): Pool {
    return this.pool;
  }
}

const request = {
  method: 'POST' as const,
  path: '/query/sql',
  body: '{"sql":"SELECT 1"}',
};

for (const authScheme of ['Basic', 'Bearer'] as const) {
  void test(`transport sends JSON with ${authScheme} authentication and request overrides`, async (t) => {
    const transport = new TestTransport({
      brokerUrl: 'http://pinot.invalid',
      token: 'secret',
      authScheme,
      connections: 2,
      bodyTimeout: 50,
      headersTimeout: 60,
      keepAliveTimeout: 70,
      keepAliveMaxTimeout: 80,
    });
    t.after(() => transport.close());
    const payload = { resultTable: { rows: [[1]] } };
    const dispatch = t.mock.method(
      transport.testPool,
      'request',
      (options: Dispatcher.RequestOptions) => {
        assert.deepEqual(options, {
          ...request,
          query: { trace: 'true' },
          bodyTimeout: 123,
          headersTimeout: 456,
          headers: {
            'x-test': 'kept',
            'content-type': 'application/json',
            'authorization': `${authScheme} secret`,
          },
        });
        return Promise.resolve({
          body: { json: () => Promise.resolve(payload) },
        });
      },
    );
    assert.equal(
      await transport.request({
        ...request,
        query: { trace: 'true' },
        bodyTimeout: 123,
        headersTimeout: 456,
        headers: {
          'x-test': 'kept',
          'content-type': 'text/plain',
          'authorization': 'overridden',
        },
      }),
      payload,
    );
    assert.equal(dispatch.mock.callCount(), 1);
  });
}

void test('transport supplies default options and exposes the live pool stats', async (t) => {
  const transport = new TestTransport({
    brokerUrl: 'http://pinot.invalid',
    token: 'secret',
  });
  t.after(() => transport.close());
  t.mock.method(
    transport.testPool,
    'request',
    (options: Dispatcher.RequestOptions) => {
      assert.deepEqual(options, {
        method: 'GET',
        path: '/health',
        body: null,
        query: {},
        bodyTimeout: null,
        headersTimeout: null,
        headers: {
          'content-type': 'application/json',
          'authorization': 'Basic secret',
        },
      });
      return Promise.resolve({ body: { json: () => Promise.resolve(null) } });
    },
  );
  assert.deepEqual(transport.stats, transport.testPool.stats);
  assert.equal(
    await transport.request({ method: 'GET', path: '/health' }),
    null,
  );
});

void test('queue cap changes take effect and fractional tolerances enforce the boundary', async (t) => {
  const transport = new TestTransport({
    brokerUrl: 'http://pinot.invalid',
    token: 'secret',
    maxQueueSize: 10,
  });
  t.after(() => transport.close());
  t.mock.getter(transport.testPool, 'stats', () => ({ queued: 2 }));
  const dispatch = t.mock.method(transport.testPool, 'request', () =>
    Promise.resolve({ body: { json: () => Promise.resolve({}) } }),
  );
  await transport.request({ ...request, options: { queueTolerance: 0.3 } });
  await assert.rejects(
    transport.request({ ...request, options: { queueTolerance: 0.2 } }),
    (error: unknown) => {
      assert.ok(error instanceof PinotError);
      assert.equal(
        PinotError.parseErrorCode(error.code).errorCode,
        EBrokerTransportErrorCode.QUEUE_TOLERANCE_LIMIT,
      );
      assert.deepEqual(error.data, {
        body: request.body,
        maxQueueTolerance: 2,
        queueSize: 2,
      });
      return true;
    },
  );
  transport.setMaxQueueSize(2);
  await assert.rejects(transport.request(request), /Max queue size reached/);
  transport.setMaxQueueSize(0);
  await transport.request(request);
  assert.equal(dispatch.mock.callCount(), 2);
});

for (const cause of [
  new errors.BodyTimeoutError(),
  new errors.ConnectTimeoutError(),
  new errors.HeadersTimeoutError(),
  new Error('connection failed'),
  'non-error rejection',
]) {
  void test(`transport maps ${cause instanceof Error ? cause.name : 'non-error'} failures`, async (t) => {
    const transport = new TestTransport({
      brokerUrl: 'http://pinot.invalid',
      token: 'secret',
    });
    t.after(() => transport.close());
    t.mock.method(transport.testPool, 'request', () => Promise.reject(cause));
    await assert.rejects(transport.request(request), (error: unknown) => {
      assert.ok(error instanceof PinotError);
      assert.equal(error.type, EPinotErrorType.TRANSPORT);
      const timeout = cause instanceof errors.UndiciError;
      assert.equal(
        PinotError.parseErrorCode(error.code).errorCode,
        timeout
          ? EBrokerTransportErrorCode.TIMEOUT
          : EBrokerTransportErrorCode.UNKNOWN,
      );
      assert.equal(error.cause, cause instanceof Error ? cause : undefined);
      assert.deepEqual(
        error.data,
        cause instanceof Error
          ? { body: request.body }
          : { body: request.body, err: cause },
      );
      return true;
    });
  });
}

void test('transport preserves HTTP response errors supplied by the dispatcher', async (t) => {
  const transport = new TestTransport({
    brokerUrl: 'http://pinot.invalid',
    token: 'secret',
  });
  t.after(() => transport.close());
  const cause = new errors.ResponseError('rejected', 403, {
    headers: { 'content-type': 'application/json' },
    body: { error: 'forbidden' },
  });
  t.mock.method(transport.testPool, 'request', () => Promise.reject(cause));
  await assert.rejects(transport.request(request), (error: unknown) => {
    assert.ok(error instanceof PinotError);
    assert.equal(
      PinotError.parseErrorCode(error.code).errorCode,
      EBrokerTransportErrorCode.INVALID_RESPONSE,
    );
    assert.deepEqual(error.data, {
      headers: cause.headers,
      body: cause.body,
      statusCode: 403,
    });
    assert.match(error.message, /403/);
    return true;
  });
});

for (const readable of [true, false]) {
  void test(`transport wraps malformed JSON with ${readable ? 'readable' : 'consumed'} body`, async (t) => {
    const transport = new TestTransport({
      brokerUrl: 'http://pinot.invalid',
      token: 'secret',
    });
    t.after(() => transport.close());
    const parseError = new SyntaxError('bad JSON');
    const readError = new TypeError('body consumed');
    t.mock.method(transport.testPool, 'request', () =>
      Promise.resolve({
        body: {
          json: () => Promise.reject(parseError),
          text: () =>
            readable
              ? Promise.resolve('<html>invalid</html>')
              : Promise.reject(readError),
        },
      }),
    );
    await assert.rejects(transport.request(request), (error: unknown) => {
      assert.ok(error instanceof PinotError);
      assert.equal(error.type, EPinotErrorType.TRANSPORT);
      assert.equal(
        PinotError.parseErrorCode(error.code).errorCode,
        EBrokerTransportErrorCode.INVALID_RESPONSE,
      );
      assert.equal(error.cause, readable ? parseError : readError);
      assert.deepEqual(
        error.data,
        readable ? { body: '<html>invalid</html>' } : undefined,
      );
      return true;
    });
  });
}

void test('transport close delegates once and propagates close failures', async (t) => {
  const transport = new TestTransport({
    brokerUrl: 'http://pinot.invalid',
    token: 'secret',
  });
  const closeError = new Error('close failed');
  const close = t.mock.method(transport.testPool, 'close', () =>
    Promise.reject(closeError),
  );
  await assert.rejects(
    transport.close(),
    (error: unknown) => error === closeError,
  );
  assert.equal(close.mock.callCount(), 1);
  close.mock.restore();
  await transport.close();
});
