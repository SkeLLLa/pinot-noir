/* node:coverage disable */
import * as assert from 'node:assert';
import { beforeEach, describe, test } from 'node:test';
import { MockAgent, MockPool } from 'undici';

import type {
  IBrokerTransportRequestOptions,
  IPinotBrokerTransport,
  IPinotPoolStats,
  IPinotQueryOptions,
} from '../src';
import { ERROR_CODES, PinotError, sql } from '../src';
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
            dataSchema: {
              columnNames: [
                'column1',
                'column2',
                'column3',
                'column4',
                'column5',
              ],
              columnDataTypes: [
                'TIMESTAMP',
                'STRING',
                'BYTES',
                'DOUBLE',
                'LONG',
              ],
            },
            rows: [
              [
                '2024-10-23 17:45:42.0',
                'string value',
                'f0f0f0f0f0f0f0f0',
                12345.67,
                10,
              ],
              // ...additional rows...
            ],
          },
          brokerId: 'mock-brocker.managed.svc.cluster.local',
          brokerReduceTimeMs: 0,
          exceptions: [],
          explainPlanNumEmptyFilterSegments: 0,
          explainPlanNumMatchAllFilterSegments: 0,
          minConsumingFreshnessTimeMs: 1737564418693,
          numConsumingSegmentsMatched: 0,
          numConsumingSegmentsProcessed: 1,
          numConsumingSegmentsQueried: 1,
          numDocsScanned: 32,
          numEntriesScannedInFilter: 2464,
          numEntriesScannedPostFilter: 480,
          numGroupsLimitReached: false,
          numRowsResultSet: 32,
          numSegmentsMatched: 4,
          numSegmentsProcessed: 299,
          numSegmentsPrunedByBroker: 4636,
          numSegmentsPrunedByLimit: 0,
          numSegmentsPrunedByServer: 0,
          numSegmentsPrunedByValue: 0,
          numSegmentsPrunedInvalid: 0,
          numSegmentsQueried: 299,
          numServersQueried: 1,
          numServersResponded: 1,
          offlineResponseSerializationCpuTimeNs: 0,
          offlineSystemActivitiesCpuTimeNs: 0,
          offlineThreadCpuTimeNs: 0,
          offlineTotalCpuTimeNs: 0,
          partialResult: false,
          realtimeResponseSerializationCpuTimeNs: 19377,
          realtimeSystemActivitiesCpuTimeNs: 1361764,
          realtimeThreadCpuTimeNs: 16257459,
          realtimeTotalCpuTimeNs: 17638600,
          requestId: '1541351204078083973',
          timeUsedMs: 71,
          totalDocs: 47143443,
          traceInfo: {
            body: q.body,
          },
        };
      });
  }

  setMaxQueueSize(): void {
    // not needed
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
      queueTolerance: 0.1,
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

    const result = await client.select<{
      column1: Date;
      column2: string;
      column3: Buffer;
      column4: number;
      column5: number;
    }>(query, options);

    assert.equal(result.sql, `SELECT * FROM table WHERE id = 1`);
    assert.equal(result.queryOptions, 'useMultistageEngine=true');
    assert.deepEqual(result.rows, [
      {
        column1: new Date('2024-10-23 17:45:42.0'),
        column2: 'string value',
        column3: Buffer.from('f0f0f0f0f0f0f0f0', 'hex'),
        column4: 12345.67,
        column5: 10,
      },
    ]);
    assert.deepEqual(result.stats, {
      segments: {
        matched: 4,
        processed: 299,
        queried: 299,
      },
      consumingSegments: {
        freshTimeMs: 1737564418693,
        queried: 1,
        processed: 1,
        matched: 0,
      },
      prunedSegments: {
        broker: 4636,
        server: 0,
        invalid: 0,
        limit: 0,
        value: 0,
      },
      server: {
        queried: 1,
        responded: 1,
      },
      docs: {
        scanned: 32,
        returned: 32,
        total: 47143443,
      },
      cpuTimeMs: {
        offline: {
          thread: 0,
          systemActivities: 0,
          responseSerialization: 0,
        },
        realtime: {
          thread: 16.257459,
          systemActivities: 1.361764,
          responseSerialization: 0.019377,
        },
      },
      queryTimeMs: {
        total: 71,
        brokerReduce: 0,
      },
      limitsReached: {
        groups: false,
        maxRowsInJoin: false,
        maxRowsInWindowReached: false,
      },
      maxRowsInOperator: undefined,
    });
  });
});

/**
 * Transport stub that returns a configured sequence of exception codes,
 * then a successful (empty) response. Counts invocations.
 */
class SequenceTransport implements IPinotBrokerTransport {
  public calls = 0;
  constructor(private readonly exceptionCodes: number[]) {}
  setMaxQueueSize(): void {
    // not needed
  }
  request<TResponse = unknown>(): Promise<TResponse> {
    const code = this.exceptionCodes[this.calls];
    this.calls++;
    if (code !== undefined) {
      return Promise.resolve({
        exceptions: [{ errorCode: code, message: `error ${code.toString()}` }],
      } as TResponse);
    }
    return Promise.resolve({
      exceptions: [],
      resultTable: {
        dataSchema: { columnNames: [], columnDataTypes: [] },
        rows: [],
      },
    } as TResponse);
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
  get stats(): IPinotPoolStats {
    return {} as IPinotPoolStats;
  }
}

void describe('Pinot client retries', async () => {
  const query = sql`SELECT * FROM t`;
  const missing = ERROR_CODES.BROKER_RESOURCE_MISSING_ERROR_CODE;

  await test('retries on BROKER_RESOURCE_MISSING (410) then succeeds', async () => {
    const transport = new SequenceTransport([missing, missing]);
    const client = new PinotClient({ transport });

    const result = await client.select(query);

    assert.equal(transport.calls, 3); // 2 failures + 1 success
    assert.deepEqual(result.rows, []);
  });

  await test('does not retry non-retryable error codes', async () => {
    const transport = new SequenceTransport([
      ERROR_CODES.QUERY_VALIDATION_ERROR_CODE,
    ]);
    const client = new PinotClient({ transport });

    await assert.rejects(client.select(query), PinotError);
    assert.equal(transport.calls, 1);
  });

  await test('exhausts retries and throws', async () => {
    const transport = new SequenceTransport([missing, missing, missing]);
    const client = new PinotClient({
      transport,
      retry: { maxRetries: 2, retryDelayMs: 0 },
    });

    await assert.rejects(client.select(query), PinotError);
    assert.equal(transport.calls, 3); // initial + 2 retries
  });

  await test('retries can be disabled', async () => {
    const transport = new SequenceTransport([missing]);
    const client = new PinotClient({ transport, retry: { maxRetries: 0 } });

    await assert.rejects(client.select(query), PinotError);
    assert.equal(transport.calls, 1);
  });
});
