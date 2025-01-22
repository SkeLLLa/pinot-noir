import type { IBrokerResponseStats } from './broker-respone.types';
import type { IQueryStats } from './types';

/**
 * Query stats.
 *
 * @public
 * @description
 * Converts and categorizes Pinot response stats.
 */
export class QueryStats implements IQueryStats {
  segments: {
    queried: number;
    processed: number;
    matched: number;
  };
  consumingSegments: {
    freshTimeMs: number;
    queried: number;
    processed: number;
    matched: number;
  };
  prunedSegments: {
    broker: number;
    server: number;
    invalid: number;
    limit: number;
    value: number;
  };
  server: {
    queried: number;
    responded: number;
  };
  docs: {
    scanned: number;
    returned: number;
    total: number;
  };
  cpuTimeMs: {
    offline: {
      thread: number;
      systemActivities: number;
      responseSerialization: number;
    };
    realtime: {
      thread: number;
      systemActivities: number;
      responseSerialization: number;
    };
  };
  queryTimeMs: {
    total: number;
    brokerReduce: number;
  };
  limitsReached: {
    groups: boolean;
    maxRowsInJoin: boolean;
    maxRowsInWindowReached: boolean;
  };
  maxRowsInOperator?: number;

  /**
   * Constructs a QueryStats instance.
   *
   * @param response - The broker response stats.
   */
  constructor(response: IBrokerResponseStats) {
    this.segments = {
      queried: response.numSegmentsQueried,
      processed: response.numSegmentsProcessed,
      matched: response.numSegmentsMatched,
    };
    this.consumingSegments = {
      freshTimeMs: response.minConsumingFreshnessTimeMs,
      queried: response.numConsumingSegmentsQueried,
      processed: response.numConsumingSegmentsProcessed,
      matched: response.numConsumingSegmentsMatched,
    };
    this.prunedSegments = {
      broker: response.numSegmentsPrunedByBroker,
      server: response.numSegmentsPrunedByServer,
      invalid: response.numSegmentsPrunedInvalid,
      limit: response.numSegmentsPrunedByLimit,
      value: response.numSegmentsPrunedByValue,
    };
    this.server = {
      queried: response.numServersQueried,
      responded: response.numServersResponded,
    };
    this.docs = {
      scanned: response.numDocsScanned,
      returned: response.numRowsResultSet,
      total: response.totalDocs,
    };
    this.cpuTimeMs = {
      offline: {
        thread: response.offlineThreadCpuTimeNs / 1e6,
        systemActivities: response.offlineSystemActivitiesCpuTimeNs / 1e6,
        responseSerialization:
          response.offlineResponseSerializationCpuTimeNs / 1e6,
      },
      realtime: {
        thread: response.realtimeThreadCpuTimeNs / 1e6,
        systemActivities: response.realtimeSystemActivitiesCpuTimeNs / 1e6,
        responseSerialization:
          response.realtimeResponseSerializationCpuTimeNs / 1e6,
      },
    };
    this.queryTimeMs = {
      total: response.timeUsedMs,
      brokerReduce: response.brokerReduceTimeMs,
    };
    this.limitsReached = {
      groups: response.numGroupsLimitReached,
      maxRowsInJoin: response.maxRowsInJoinReached ?? false,
      maxRowsInWindowReached: response.maxRowsInWindowReached ?? false,
    };
  }
}
