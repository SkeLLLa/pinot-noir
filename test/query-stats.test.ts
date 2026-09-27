import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { IBrokerResponseStats } from '../src/client/broker/broker-respone.types';
import { QueryStats } from '../src/client/broker/query-stats';

const response = {
  numSegmentsQueried: 1,
  numSegmentsProcessed: 2,
  numSegmentsMatched: 3,
  minConsumingFreshnessTimeMs: 4,
  numConsumingSegmentsQueried: 5,
  numConsumingSegmentsProcessed: 6,
  numConsumingSegmentsMatched: 7,
  numSegmentsPrunedByBroker: 8,
  numSegmentsPrunedByServer: 9,
  numSegmentsPrunedInvalid: 10,
  numSegmentsPrunedByLimit: 11,
  numSegmentsPrunedByValue: 12,
  numServersQueried: 13,
  numServersResponded: 14,
  numDocsScanned: 15,
  numRowsResultSet: 16,
  totalDocs: 17,
  offlineThreadCpuTimeNs: 1500000,
  offlineSystemActivitiesCpuTimeNs: 2500000,
  offlineResponseSerializationCpuTimeNs: 3500000,
  realtimeThreadCpuTimeNs: 4500000,
  realtimeSystemActivitiesCpuTimeNs: 5500000,
  realtimeResponseSerializationCpuTimeNs: 6500000,
  timeUsedMs: 18,
  brokerReduceTimeMs: 19,
  numGroupsLimitReached: true,
} as IBrokerResponseStats;

void test('groups broker statistics and converts all CPU times to milliseconds', () => {
  const stats = new QueryStats(response);
  assert.deepEqual(stats.segments, { queried: 1, processed: 2, matched: 3 });
  assert.deepEqual(stats.consumingSegments, {
    freshTimeMs: 4,
    queried: 5,
    processed: 6,
    matched: 7,
  });
  assert.deepEqual(stats.prunedSegments, {
    broker: 8,
    server: 9,
    invalid: 10,
    limit: 11,
    value: 12,
  });
  assert.deepEqual(stats.server, { queried: 13, responded: 14 });
  assert.deepEqual(stats.docs, { scanned: 15, returned: 16, total: 17 });
  assert.deepEqual(stats.cpuTimeMs, {
    offline: { thread: 1.5, systemActivities: 2.5, responseSerialization: 3.5 },
    realtime: {
      thread: 4.5,
      systemActivities: 5.5,
      responseSerialization: 6.5,
    },
  });
  assert.deepEqual(stats.queryTimeMs, { total: 18, brokerReduce: 19 });
  assert.deepEqual(stats.limitsReached, {
    groups: true,
    maxRowsInJoin: false,
    maxRowsInWindowReached: false,
  });
});

void test('retains explicit operator limits for both true and false responses', () => {
  for (const reached of [true, false]) {
    const stats = new QueryStats({
      ...response,
      numGroupsLimitReached: reached,
      maxRowsInJoinReached: reached,
      maxRowsInWindowReached: reached,
    });
    assert.deepEqual(stats.limitsReached, {
      groups: reached,
      maxRowsInJoin: reached,
      maxRowsInWindowReached: reached,
    });
  }
});
