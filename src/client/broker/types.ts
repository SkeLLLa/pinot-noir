/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type PoolStats from 'undici/types/pool-stats';
import type { Sql } from '../../utils/tag';

export type * from './broker-respone.types';
export type * from './type-parsers/types';

/**
 * Pinot transport pool statistics.
 *
 * @public
 */
export interface IPinotPoolStats extends PoolStats {
  //
}

/**
 * Pinot query statistics.
 * Just converted and categorized Pinot response stats.
 *
 * @public
 */
export interface IQueryStats {
  /**
   * Segment stats.
   */
  segments: {
    /**
     * Number of segments queried.
     */
    queried: number;
    /**
     * Number of segments processed.
     */
    processed: number;
    /**
     * Number of segments matched.
     */
    matched: number;
  };
  /**
   * Consuming segments.
   */
  consumingSegments: {
    /**
     * Freshness time in milliseconds.
     */
    freshTimeMs: number;
    /**
     * Number of consuming segments queried.
     */
    queried: number;
    /**
     * Number of consuming segments processed.
     */
    processed: number;
    /**
     * Number of consuming segments matched.
     */
    matched: number;
  };
  /**
   * Pruned by segments count.
   */
  prunedSegments: {
    /**
     * Number of segments pruned by broker.
     */
    broker: number;
    /**
     * Number of segments pruned by server.
     */
    server: number;
    /**
     * Number of invalid segments pruned.
     */
    invalid: number;
    /**
     * Number of segments pruned by limit.
     */
    limit: number;
    /**
     * Number of segments pruned by value.
     */
    value: number;
  };
  /**
   * Server stats.
   */
  server: {
    /**
     * Number of servers queried.
     */
    queried: number;
    /**
     * Number of servers responded.
     * If everything is ok, should be equal to `queried`.
     */
    responded: number;
  };
  /**
   * Docs stats.
   */
  docs: {
    /**
     * Number of documents scanned.
     */
    scanned: number;
    /**
     * Number of documents returned.
     */
    returned: number;
    /**
     * Total number of documents.
     */
    total: number;
  };
  /**
   * CPU stats.
   */
  cpuTimeMs: {
    offline: {
      /**
       * Thread CPU time in milliseconds for offline segments.
       */
      thread: number;
      /**
       * System activities CPU time in milliseconds for offline segments.
       */
      systemActivities: number;
      /**
       * Response serialization CPU time in milliseconds for offline segments.
       */
      responseSerialization: number;
    };
    realtime: {
      /**
       * Thread CPU time in milliseconds for realtime segments.
       */
      thread: number;
      /**
       * System activities CPU time in milliseconds for realtime segments.
       */
      systemActivities: number;
      /**
       * Response serialization CPU time in milliseconds for realtime segments.
       */
      responseSerialization: number;
    };
  };

  queryTimeMs: {
    /**
     * Query time in milliseconds.
     */
    total: number;
    /**
     * Broker reduce time in milliseconds.
     * Important to understand if query is bottlenecked on Broker or Server side.
     */
    brokerReduce: number;
  };

  limitsReached: {
    /**
     * Indicates if the group limit was reached.
     */
    groups: boolean;
    /**
     * Indicates if the maximum number of rows in join was reached.
     */
    maxRowsInJoin: boolean;
    /**
     * Indicates if the maximum number of rows in window was reached.
     */
    maxRowsInWindowReached: boolean;
  };

  /**
   * Maximum number of rows in operator.
   */
  maxRowsInOperator?: number;
}

/**
 * Query result.
 *
 * @public
 */
export interface IQueryResult<TRows = unknown> {
  /**
   * Data rows.
   */
  rows: TRows;
  /**
   * Query stats.
   */
  stats: IQueryStats;
  /**
   * Compiled SQL query.
   */
  sql: string;
  /**
   * Query options.
   */
  queryOptions?: string | undefined;
}

// TODO: add some codes
/**
 * Broker error codes.
 *
 * @public
 */
export const enum EBrokerErrorCode {
  /**
   * Unknown.
   */
  UNKNOWN,
}

/**
 * Predefined queue tolerance values.
 *
 * @public
 */
export type TQueueTolerancePredefined =
  0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1;

/**
 * Query options.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/query-options | Pinot query options} for actual info
 */
export interface IPinotQueryOptions {
  /** Timeout of the query in milliseconds. */
  timeoutMs?: number;

  /** Enables advanced null handling. (introduced in 0.11.0) */
  enableNullHandling?: boolean;

  /** Return verbose result for `EXPLAIN` query. (introduced in 0.11.0) */
  explainPlanVerbose?: boolean;

  /** Use multi-stage engine to execute the query. (introduced in 0.11.0) */
  useMultistageEngine?: boolean;

  /** Maximum threads to use to execute the query. */
  maxExecutionThreads?: number;

  /** Number of replica groups to query when replica-group based routing is enabled. (introduced in 0.11.0) */
  numReplicaGroupsToQuery?: number;

  /** Minimum groups to keep when trimming groups at the segment level for group-by queries. */
  minSegmentGroupTrimSize?: number;

  /** Minimum groups to keep when trimming groups at the server level for group-by queries. */
  minServerGroupTrimSize?: number;

  /**
   * Which indexes to skip usage of (i.e. scan instead), per-column. This is useful for side-by-side comparison/debugging. There can be cases where the use of an index is actually more expensive than performing a scan of the docs which match other filters. One such example could be a low-selectivity inverted index used in conjunction with another highly selective filter.
   * Config can be specified using url parameter format: skipIndexes='col1=inverted,range&col2=inverted'.
   * Possible index types to skip are: sorted, range, inverted, H3. To find out which indexes are used to resolve a given query, use the EXPLAIN query.
   * @defaultValue `null`
   **/
  skipIndexes?: string;

  /** For upsert-enabled table, skip the effect of upsert and query all records. */
  skipUpsert?: boolean;

  /**
   * Use star-tree index if available. (introduced in 0.11.0)
   *
   * @defaultValue `true`
   **/
  useStarTree?: boolean;

  /** Enable scan reordering for AND clauses. */
  andScanReordering?: boolean;

  /** Maximum rows allowed in join hash-table creation phase. */
  maxRowsInJoin?: number;

  /**
   * Indicates that the values in the IN clause are already sorted.
   *
   * @defaultValue `false`
   **/
  inPredicatePreSorted?: boolean;

  /** Algorithm to use to look up the dictionary ids for the IN clause values. */
  inPredicateLookupAlgorithm?:
    'DIVIDE_BINARY_SEARCH' | 'SCAN' | 'PLAIN_BINARY_SEARCH';

  /** Maximum length of the serialized response per server for a query. */
  maxServerResponseSizeBytes?: number;

  /** Maximum serialized response size across all servers for a query. */
  maxQueryResponseSizeBytes?: number;
  /**
   * Use multi stage engine to fill empty response schema for v1 and v2 queries.
   * @see {@link https://github.com/apache/pinot/issues/15064 | Significant Latency Overhead due to empty Response Handling}
   * @see {@link https://github.com/apache/pinot/pull/14918 | Enhance data schema generation for empty response}
   * @see {@link https://github.com/apache/pinot/pull/13831 | Return improved dataschema for empty results when all segments are pruned by broker}
   */
  useMSEToFillEmptyResponseSchema?: boolean;
  /**
   * Queue tolerance in percent of `maxQueueSize`.
   * If maxQueueSize * queueTolerance \<= queue size the request is discarded.
   *
   * @defaultValue 1
   */
  queueTolerance?: TQueueTolerancePredefined | number;
  /**
   * For aggregation and group-by queries, ask servers to directly return final results instead of intermediate results for aggregations.
   * Can be applied when the group key is server partitioned, i.e. the column(s) is partitioned, and all the data for a partition is served by the same server.
   */
  serverReturnFinalResult?: boolean;
  /**
   * For group-by queries, ask servers to directly return final results instead of intermediate results for aggregations.
   * Different from serverReturnFinalResult, this option should be used when the group key is not server partitioned, but the aggregated column is server partitioned. It is particularly useful for distinct count queries.
   * When this option is enabled, server will return final results, but won't directly trim the result to the query limit.
   *
   * @defaultValue false
   */
  serverReturnFinalResultKeyUnpartitioned?: boolean;

  /**
   * This config can be set to true to avoid computing all the groups in a group by query with only filtered aggregations (and no non-filtered aggregations). By default, the groups are computed over all the rows returned by the main filter, even if certain rows will never match any of the aggregation filters. This is the standard SQL behavior. However, if the selectivity of the main filter is very high as compared to the selectivity of the aggregation filters, this query option can help provide a big performance boost if the empty groups aren't required. For instance, a query like SELECT SUM(X) FILTER (WHERE Y = 1) FROM mytable will compute the groups over all the rows in the table by default since there's no main query filter. Setting this query option to true in such cases can massively improve performance if there's an inverted index on column Y for instance.
   *
   * @defaultValue false
   */
  filteredAggregationsSkipEmptyGroups?: boolean;

  /**
   * Set dropResults=true in the config to drop the resultTable from the response.
   * Use this option to troubleshoot a customer's query (which may have sensitive data in the result) using metadata only.
   *
   * @defaultValue false
   */
  dropResults?: boolean;

  /**
   * Set skipUnavailableServers=true in the config to continue sending queries to remaining servers if dispatching a query fails.
   *
   * @defaultValue false
   */
  skipUnavailableServers?: boolean;
  /**
   * Use fixed replica for query execution.
   * By default, the Pinot broker will route queries to the segment replica that is currently under the least load. It is possible to have the Pinot broker route all queries for a specific table to the same server for a given segment. You might do this if you are finding inconsistencies in query results due to an offset for consuming segments across different replicas.
   *
   * @see {@link https://docs.pinot.apache.org/operators/operating-pinot/tuning/routing#single-replica-routing | Single-replica routing}
   *
   * @defaultValue false
   */
  useFixedReplica?: boolean;
  /**
   * Use new query optimizer in the Multistage Engine that computes and tracks precise Data Distribution across the entire plan before running some critical optimizations like Sort Pushdown, Aggregate Split/Pushdown, etc.
   *
   * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/physical-optimizer | Physical Optimizer}
   * @defaultValue false
   */
  usePhysicalOptimizer?: boolean;
}

/**
 * Pinot client interface.
 *
 * @public
 */
export interface IPinotClient {
  /**
   * Execute pinot sql query
   *
   * @public
   * @param query - Sql query body
   * @param options - Query options
   * @param trace - Pass trace parameter to pinot
   * @returns Result rows with stats
   */
  select<TResult>(
    query: Sql,
    options?: IPinotQueryOptions,
    trace?: boolean,
  ): Promise<IQueryResult<TResult[]>>;

  /**
   * Transport stats.
   */
  transportStats: IPinotPoolStats;
}

/**
 * Non pinot options list.
 * @private
 */
export const NON_PINOT_OPTIONS: readonly (keyof IPinotQueryOptions)[] = [
  'queueTolerance',
];
