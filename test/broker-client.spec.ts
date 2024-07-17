import * as assert from 'node:assert';
import { describe, test } from 'node:test';
import { PinotClient } from '../src/client/broker/broker-client';

void describe('Pinot client', async () => {
  await test('serializes query options', () => {
    assert.strictEqual(
      PinotClient.toQueryOptions({
        timeoutMs: 20000,
        useMultistageEngine: true,
      }),
      'timeoutMs=20000;useMultistageEngine=true',
    );
  });
});
