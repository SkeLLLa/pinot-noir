import type { IBrokerResponseStats } from './broker-respone.types';
import type { IQueryStats } from './types';

type TLimitsReached = IQueryStats['limitsReached'];
type TMemAllocatedBytes = NonNullable<IQueryStats['memAllocatedBytes']>;
type TRemoteAccess = NonNullable<IQueryStats['remoteAccess']>;

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
  limitsReached: TLimitsReached;
  maxRowsInOperator?: number;
  approximatedResult?: boolean;
  groupsTrimmed?: boolean;
  memAllocatedBytes?: TMemAllocatedBytes;
  remoteAccess?: TRemoteAccess;

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
    this.limitsReached = QueryStats.toLimitsReached(response);
    if (response.maxRowsInOperator !== undefined) {
      this.maxRowsInOperator = response.maxRowsInOperator;
    }
    if (response.approximatedResult !== undefined) {
      this.approximatedResult = response.approximatedResult;
    }
    if (response.groupsTrimmed !== undefined) {
      this.groupsTrimmed = response.groupsTrimmed;
    }
    const memAllocatedBytes = QueryStats.toMemAllocatedBytes(response);
    if (memAllocatedBytes) {
      this.memAllocatedBytes = memAllocatedBytes;
    }
    const remoteAccess = QueryStats.toRemoteAccess(response);
    if (remoteAccess) {
      this.remoteAccess = remoteAccess;
    }
  }

  // Optional limits are added only when the broker reports them.
  private static toLimitsReached(
    response: IBrokerResponseStats,
  ): TLimitsReached {
    const limits: TLimitsReached = {
      groups: response.numGroupsLimitReached,
      maxRowsInJoin: response.maxRowsInJoinReached ?? false,
      maxRowsInWindowReached: response.maxRowsInWindowReached ?? false,
    };
    const optional = {
      groupsWarning: response.numGroupsWarningLimitReached,
      maxRowsInDistinct: response.maxRowsInDistinctReached,
      maxRowsWithoutChangeInDistinct:
        response.maxRowsWithoutChangeInDistinctReached,
      maxExecutionTimeInDistinct: response.maxExecutionTimeInDistinctReached,
    };
    for (const [key, value] of Object.entries(optional)) {
      if (value !== undefined) {
        limits[key as keyof typeof optional] = value;
      }
    }
    return limits;
  }

  private static toMemAllocatedBytes(
    response: IBrokerResponseStats,
  ): TMemAllocatedBytes | undefined {
    if (
      response.offlineThreadMemAllocatedBytes === undefined &&
      response.realtimeThreadMemAllocatedBytes === undefined
    ) {
      return undefined;
    }
    return {
      offline: {
        thread: response.offlineThreadMemAllocatedBytes ?? 0,
        responseSerialization:
          response.offlineResponseSerMemAllocatedBytes ?? 0,
        total: response.offlineTotalMemAllocatedBytes ?? 0,
      },
      realtime: {
        thread: response.realtimeThreadMemAllocatedBytes ?? 0,
        responseSerialization:
          response.realtimeResponseSerMemAllocatedBytes ?? 0,
        total: response.realtimeTotalMemAllocatedBytes ?? 0,
      },
    };
  }

  private static toRemoteAccess(
    response: IBrokerResponseStats,
  ): TRemoteAccess | undefined {
    if (response.numRemoteAccesses === undefined) {
      return undefined;
    }
    return {
      count: response.numRemoteAccesses,
      bytes: response.remoteAccessBytes ?? 0,
      directCount: response.numDirectRemoteAccesses ?? 0,
      directBytes: response.directRemoteAccessBytes ?? 0,
    };
  }
}
