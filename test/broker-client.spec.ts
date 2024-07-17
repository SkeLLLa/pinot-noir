import * as assert from 'node:assert';
import { beforeEach, describe, test } from 'node:test';
import { MockAgent, MockPool } from 'undici';
import {
  IBrokerTransportRequestOptions,
  IPinotBrokerTransport,
  IPinotPoolStats,
  IPinotQueryOptions,
  sql,
} from '../src';
import { PinotClient } from '../src/client/broker/broker-client';

const brokerUrl = 'http://broker.pinot.mock';

// MockPool
class MockTransport implements IPinotBrokerTransport {
  private pool: MockPool;
  private agent: MockAgent = new MockAgent();
  constructor() {
    this.agent.get(brokerUrl);
    this.pool = new MockPool(brokerUrl, { agent: this.agent });
    this.pool
      .intercept({ method: 'POST', path: '/query/sql' })
      .defaultReplyHeaders({ 'content-type': 'application/json' })
      .reply(200, (q) => {
        return {
          resultTable: {
            dataSchema: { columnNames: ['id', 'name'] },
            rows: [[1, 'test']],
          },
          numDocsScanned: 1,
          numServersQueries: 1,
          numSegmentsMatched: 1,
          minConsumingFreshnessTimeMs: 100,
          numConsumingSegmentsQueried: 1,
          numEntriesScannedPostFilter: 1,
          numGroupsLimitReached: false,
          numSegmentsProcessed: 1,
          numSegmentsQueried: 1,
          timeUsedMs: 100,
          totalDocs: 1,
          traceInfo: {
            body: q.body,
          },
          numServersResponded: 1,
        };
      });
  }

  async request<TResponse = unknown>({
    method,
    headers,
    path,
    body,
    query,
  }: IBrokerTransportRequestOptions): Promise<TResponse> {
    const response = await this.pool.request({
      method,
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      path,
      body: body ?? null,
      query: query ?? {},
    });
    const raw = (await response.body.json()) as TResponse;

    return raw;
  }
  close(): Promise<void> {
    return this.pool.close();
  }
  get stats(): IPinotPoolStats {
    return this.pool.stats;
  }
}

void describe('Pinot client', async () => {
  // const transport = new PinotBrokerJSONTransport({ brokerUrl, token: 'test' });

  let client: PinotClient;
  let transport: IPinotBrokerTransport;

  beforeEach(() => {
    transport = new MockTransport();
    client = new PinotClient({ transport });
  });

  await test('.toQueryOptions should format options correctly', () => {
    const options: IPinotQueryOptions = {
      timeoutMs: 20000,
      useMultistageEngine: true,
    };
    const result = PinotClient.toQueryOptions(options);
    assert.equal(result, 'timeoutMs=20000;useMultistageEngine=true');
  });

  await test('.toQueryOptions should return undefined if no options provided', () => {
    const result = PinotClient.toQueryOptions(undefined);
    assert.equal(result, undefined);
  });

  await test('PinotClient.select should format SQL query and call transport.request', async () => {
    const query = sql`SELECT * FROM table WHERE id = ${1}`;
    const options: IPinotQueryOptions = { useMultistageEngine: true };

    const result = await client.select<{ id: number; name: string }>(
      query,
      options,
    );

    assert.equal(result.sql, `SELECT * FROM table WHERE id = 1`);
    assert.equal(result.queryOptions, 'useMultistageEngine=true');
    assert.deepEqual(result.rows, [{ id: 1, name: 'test' }]);
    assert.deepEqual(result.stats, {
      traceInfo: {
        body: '{"sql":"SELECT * FROM table WHERE id = 1","queryOptions":"useMultistageEngine=true"}',
      },
      segments: {
        matched: 1,
        processed: 1,
        queried: 1,
      },
      server: {
        queries: 1,
        responded: 1,
      },
      docs: {
        scanned: 1,
        returned: 1,
        total: 1,
      },
      totalTimeMs: 100,
      minConsumingFreshnessTimeMs: 100,
      numConsumingSegmentsQueried: 1,
      numEntriesScannedPostFilter: 1,
      numGroupsLimitReached: false,
    });
  });
});
