/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type PoolStats from 'undici/types/pool-stats';
import type { Sql } from '../../utils/tag';
import { ERROR_CODES } from '../errors/pinot';

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
 * Default Pinot error codes that trigger a query retry.
 *
 * Contains transient broker/server side failures that are safe to retry.
 * `BROKER_RESOURCE_MISSING` (410) can be caused by stale broker routing /
 * external view updates and is usually resolved on retry.
 *
 * @public
 */
export const DEFAULT_RETRYABLE_ERROR_CODES: readonly number[] = [
  ERROR_CODES.BROKER_RESOURCE_MISSING_ERROR_CODE,
];

/**
 * Query retry options.
 *
 * @public
 */
export interface IPinotRetryOptions {
  /**
   * Maximum number of retry attempts (in addition to the initial request).
   * Set to `0` to disable retries.
   *
   * @defaultValue 2
   */
  maxRetries?: number;
  /**
   * Base delay between retry attempts in milliseconds.
   *
   * @defaultValue 100
   */
  retryDelayMs?: number;
  /**
   * Exponential backoff factor applied to `retryDelayMs` per attempt.
   * Delay for attempt `n` = `retryDelayMs * backoffFactor ^ (n - 1)`.
   *
   * @defaultValue 2
   */
  backoffFactor?: number;
  /**
   * Pinot error codes that trigger a retry.
   *
   * @defaultValue {@link DEFAULT_RETRYABLE_ERROR_CODES} (`[410]`)
   */
  retryableErrorCodes?: readonly number[];
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

  /**
   * For multi-stage queries, add this many milliseconds to the passive deadline used while waiting on upstream stages or mailbox data. Does not change the active query deadline set by `timeoutMs`.
   *
   * @defaultValue broker level config (default `100`)
   */
  extraPassiveTimeoutMs?: number;

  /**
   * For eligible single-stage queries, controls whether broker-side materialized-view rewrite is allowed. Set to `false` to bypass MV rewrite for one query and force the base-table path.
   *
   * @defaultValue `true` (enabled when absent)
   */
  enableMaterializedViewRewrite?: boolean;

  /** Controls behavior when a join operation exceeds `maxRowsInJoin`. */
  joinOverflowMode?: 'THROW' | 'BREAK';

  /**
   * Maximum rows allowed in a window function operation, to prevent excessive memory usage when processing large window frames.
   *
   * @defaultValue cluster config `pinot.query.window.max.rows`, or `2^20` (1048576) if unset
   */
  maxRowsInWindow?: number;

  /** Controls behavior when a window operation exceeds `maxRowsInWindow`. */
  windowOverflowMode?: 'THROW' | 'BREAK';

  /**
   * For upsert tables using `SNAPSHOT` consistency mode, overrides the query-time freshness window for the upsert view. `0` forces a refresh for every query.
   *
   * @defaultValue table's `upsertViewRefreshIntervalMs`
   */
  upsertViewFreshnessMs?: number;

  /**
   * Comma-delimited list of defaultly-enabled MSE query planner rules to skip, e.g. `'FilterProjectTranspose,PruneEmptySort'`. Rule names match `EXPLAIN PLAN FOR` output.
   *
   * @defaultValue `null/empty`
   */
  skipPlannerRules?: string;

  /**
   * Comma-delimited list of defaultly-disabled MSE query planner rules to enable, e.g. `'AggregateJoinTransposeExtended,SortProjectTranspose'`.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/default-disabled-rules | Default Disabled Rules}
   * @defaultValue `null/empty`
   */
  usePlannerRules?: string;

  /**
   * Ignores `SERVER_SEGMENT_MISSING` exceptions when a routed segment is unavailable on a server, so the query can continue instead of failing. The query can succeed while silently omitting data from the missing segments.
   *
   * @defaultValue false
   */
  ignoreMissingSegments?: boolean;

  /**
   * Selects a named table sampler from the table config to run the query against a sampled subset of segments.
   *
   * @see {@link https://docs.pinot.apache.org/reference/configuration-reference/table#table-samplers | Table samplers}
   * @defaultValue `null/empty` (no table sampler)
   */
  sampler?: string;

  /**
   * Custom correlation ID for a query, used for tracking and query cancellation.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/query-correlation-id | Query Correlation ID}
   * @defaultValue `null/empty`
   */
  clientQueryId?: string;

  /**
   * Assigns the query to a named application for application-level query quotas.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/query-quotas | Query Quotas}
   * @defaultValue `null/empty` (no application name)
   */
  applicationName?: string;

  /**
   * For SSE `GROUP BY ... LIMIT` without `ORDER BY` or `HAVING`, retains a deterministic subset by keeping the lexicographically smallest group keys during server/broker reduction. Does not rank by an aggregate; use `ORDER BY` for top-N results.
   *
   * @defaultValue false
   */
  accurateGroupByWithoutOrderBy?: boolean;

  /**
   * Caps how many groups each query operator keeps before it stops admitting new groups, for both leaf and intermediate MSE stages.
   *
   * @defaultValue server level config (default `100000`)
   */
  numGroupsLimit?: number;

  /**
   * Warning threshold for the number of groups a query operator accumulates. Sets `numGroupsWarningLimitReached=true` in response metadata but continues execution.
   *
   * @defaultValue server level config (default `150000`)
   */
  numGroupsWarningLimit?: number;

  /**
   * For multi-stage group-by queries, throws an exception instead of returning partial results when `numGroupsLimit` is reached.
   *
   * @defaultValue false
   */
  errorOnNumGroupsLimit?: boolean;

  /**
   * For single-stage selection queries, allows Pinot to read a sorted segment in descending order for `ORDER BY ... DESC` instead of scanning ascending and reordering, enabling early termination.
   *
   * @defaultValue false
   */
  allowReverseOrder?: boolean;

  /**
   * Minimum initial capacity used when creating `IndexedTable` instances to merge grouped results. Higher values reduce rehashing for many-group queries at the cost of memory for smaller ones.
   *
   * @defaultValue 128
   */
  minInitialIndexedTableCapacity?: number;

  /**
   * For group-by queries ordering by all group keys, use sort-aggregation instead of hash-aggregation when `LIMIT` is below this threshold.
   */
  sortAggregateLimitThreshold?: number;

  /**
   * Enables stage-level spooling for multi-stage queries, letting Pinot reuse equivalent stages within a query plan instead of executing them repeatedly.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/stage-level-spooling | Stage-level spooling}
   * @defaultValue broker level config (default `false`)
   */
  useSpools?: boolean;

  /**
   * Ignores virtual columns (those starting with `$`) during MSE query planning and execution, e.g. so they don't participate in `NATURAL JOIN` condition matching.
   *
   * @defaultValue false
   */
  excludeVirtualColumns?: boolean;

  /**
   * Traces MSE planner rule productions, returning rules that produced new relations along with timing, for debugging query planning.
   *
   * @defaultValue false
   */
  traceRuleProductions?: boolean;

  /**
   * Controls MSE explain behavior. When `true`, servers are asked to return the segment plan; when `false`, only the logical plan is returned.
   *
   * @defaultValue broker level config (default `false`)
   */
  explainAskingServers?: boolean;

  /**
   * Enables multi-cluster querying (federation) to route queries across multiple Pinot clusters. Requires broker configuration with remote cluster connections; only applies to logical tables.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-cluster-querying | Multi-Cluster Querying}
   * @defaultValue false
   */
  enableMultiClusterRouting?: boolean;

  /**
   * Assigns the query to a named workload for CPU/memory accounting and workload budget enforcement.
   *
   * @see {@link https://docs.pinot.apache.org/operate-pinot/tuning/workload-query-isolation | Workload-Based Query Resource Isolation}
   * @defaultValue `null/empty` (default workload, no budget enforcement)
   */
  workloadName?: string;

  /**
   * Marks the query as a secondary workload query, running with limited threads or mapped to the configured secondary workload budget depending on scheduler.
   *
   * @see {@link https://docs.pinot.apache.org/operate-pinot/tuning/workload-query-isolation | Workload-Based Query Resource Isolation}
   * @defaultValue false
   */
  isSecondaryWorkload?: boolean;

  /**
   * For multi-stage joins, tells Pinot to infer partition information from the joined tables to enable colocated execution when table partitioning and server assignment allow it.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/join-strategies | Colocated join strategy}
   * @defaultValue broker level config (default `false`)
   */
  inferPartitionHint?: boolean;

  /**
   * When sort-aggregation is used (see `sortAggregateLimitThreshold`), use single-threaded sequential combine instead of parallel pair-wise combine when the number of segments to merge is below this threshold.
   *
   * @defaultValue Number of CPU cores
   */
  sortAggregateSingleThreadedNumSegmentsThreshold?: number;

  /**
   * For `IVF_FLAT`, `IVF_PQ`, and `IVF_ON_DISK` vector search, sets how many inverted lists Pinot probes per segment before collecting ANN candidates. Higher values usually improve recall at the cost of latency. Ignored for HNSW indexes and for the exact-scan fallback path used on segments without a vector index.
   *
   * @see {@link https://docs.pinot.apache.org/basics/indexing/vector-index | Vector index}
   * @defaultValue `4` for `IVF_FLAT`, `IVF_PQ`, and `IVF_ON_DISK`; ignored for HNSW and exact-scan fallback
   */
  vectorNprobe?: number;

  /**
   * For vector search that uses an ANN index, re-score the ANN candidates with exact distance from the forward index before Pinot returns the final top-K. Improves accuracy but does not turn ANN search into a full exact scan.
   *
   * @see {@link https://docs.pinot.apache.org/basics/indexing/vector-index | Vector index}
   * @defaultValue `true` for `IVF_PQ` (PQ distances are approximate by construction); `false` for HNSW and `IVF_FLAT`
   */
  vectorExactRerank?: boolean;

  /**
   * When `vectorExactRerank=true`, sets how many ANN candidates Pinot retrieves before exact reranking. Pinot always uses at least `topK`, and ignores this option when exact rerank is disabled.
   *
   * @see {@link https://docs.pinot.apache.org/basics/indexing/vector-index | Vector index}
   * @defaultValue `topK * 10` when exact rerank is enabled
   */
  vectorMaxCandidates?: number;

  /**
   * For vector similarity queries, return all results within this distance threshold instead of limiting to top-K. Enables confidence-based retrieval where all results meeting a quality threshold are returned. Applies to `VECTOR_SIMILARITY` queries; the distance function used in the `WHERE` clause determines which threshold is applied.
   *
   * @defaultValue Not set (uses top-K retrieval)
   */
  vectorDistanceThreshold?: number;

  /**
   * For HNSW vector search, controls how many nodes the graph traversal visits (search beam width). Higher values improve recall at the cost of query latency. Typical ranges: 100-150 for low latency, 200-300 for balanced, 400-800 for high recall. Ignored for IVF indexes and the exact-scan fallback path.
   *
   * @see {@link https://docs.pinot.apache.org/basics/indexing/vector-index | Vector index}
   * @defaultValue From index config (defaults to `topK` when not set)
   */
  vectorEfSearch?: number;

  /**
   * For HNSW vector search, toggles competitive (relative-distance) pruning during graph traversal. Disabling this (`false`) can improve recall on some data distributions at the cost of higher latency. Ignored for non-HNSW indexes.
   *
   * @defaultValue `true`
   */
  vectorUseRelativeDistance?: boolean;

  /**
   * For HNSW vector search, toggles the bounded top-K collector during graph traversal. Disabling this (`false`) may improve recall in certain scenarios. Ignored for non-HNSW indexes.
   *
   * @defaultValue `true`
   */
  vectorUseBoundedQueue?: boolean;

  /**
   * For debugging upsert tables, bypass the consistent upsert view maintained by `SYNC` or `SNAPSHOT` consistency mode and query as if the table were using `NONE` mode.
   *
   * @defaultValue false
   */
  skipUpsertView?: boolean;

  /**
   * For multi-stage `UNNEST` queries on the logical planner path, prune unused passthrough columns from the `UNNEST` output, including the source array when nothing downstream references it. Only enable after all servers in the cluster support the feature. Ignored when `usePhysicalOptimizer=true`.
   */
  unnestColumnPruning?: boolean;

  /**
   * For multi-stage `ORDER BY ... LIMIT` queries, controls when Pinot pushes the sort-and-limit operation below the sort exchange so each upstream worker sends only its top rows. Applied only when the effective fetch is at or below this integer threshold.
   *
   * @defaultValue broker level config (default `10000`)
   */
  sortExchangeCopyThreshold?: number;

  /**
   * For partitioned realtime tables in the multi-stage engine, infer segment partitions from realtime segment names when Pinot cannot rely on the stored segment-partition metadata. Falls back to unpartitioned distribution if partitions cannot be inferred.
   *
   * @defaultValue false
   */
  inferRealtimeSegmentPartition?: boolean;

  /**
   * Enable Multistage Engine Lite Mode, which runs MSE queries using a scatter-gather paradigm (like the single-stage engine) with a configurable limit on rows returned by each leaf stage instance. Requires both `useMultistageEngine=true` and `usePhysicalOptimizer=true`. (introduced in 1.4.0)
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/multistage-lite-mode | Multistage Lite Mode}
   */
  useLiteMode?: boolean;

  /**
   * For Multistage Engine Lite Mode, overrides the maximum number of records a leaf stage worker is allowed to return.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/multistage-lite-mode | Multistage Lite Mode}
   * @defaultValue broker level config (default `100000`)
   */
  liteModeLeafStageLimit?: number;

  /**
   * For Multistage Engine Lite Mode, overrides the fan-out-adjusted leaf-stage limit. Pinot divides this value by the number of workers assigned to the leaf stage and uses the quotient as the per-worker hard limit instead of `liteModeLeafStageLimit`.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/multistage-lite-mode | Multistage Lite Mode}
   * @defaultValue broker level config (disabled when unset or non-positive)
   */
  liteModeLeafStageFanOutAdjustedLimit?: number;

  /**
   * For Multistage Engine Lite Mode, controls where Pinot runs the non-leaf stages. When `true`, runs the non-leaf stages in the broker to preserve the scatter-gather execution model. When `false`, runs the non-leaf stages on servers instead.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/multi-stage-query/multistage-lite-mode | Multistage Lite Mode}
   */
  runInBroker?: boolean;

  /**
   * For multi-stage queries, use the same servers chosen for leaf stages as the workers for intermediate stages instead of selecting from all enabled servers. Helps control fanout and reduce data shuffling.
   *
   * @defaultValue false
   */
  useLeafServerForIntermediateStage?: boolean;

  /**
   * For multi-stage queries, switch broker-to-server dispatch to the streaming `SubmitWithStream` stats path instead of the legacy unary submit path. Adds `streamStatsCoverage` to the response. Only enable after every server in the cluster supports the streaming RPC, since Pinot does not fall back automatically on mixed-version clusters.
   *
   * @defaultValue broker level config (default false)
   */
  streamStats?: boolean;

  /**
   * Specifies a prioritized list of server pools for broker query routing, provided as a vertical bar (`|`) separated list of pool identifiers (integers). The broker attempts to route queries to the specified pools in order, falling back gracefully to other available replicas if none of the preferred pools are available. Currently supported for Balanced and ReplicaGroup routing strategies with Adaptive Server Selection in non-MSE mode. (introduced in 1.4.0)
   *
   * @defaultValue `null/empty` (no pool preference; use default routing)
   */
  orderedPreferredPools?: string;

  /**
   * When set to `true`, a cursor is returned instead of the complete result set, allowing clients to fetch query results incrementally. Useful for large result sets.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/cursor-pagination | Cursor Pagination}
   * @defaultValue false (return full result set)
   */
  getCursor?: boolean;

  /**
   * Number of rows each cursor page should contain. Only applies when `getCursor=true`.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/cursor-pagination | Cursor Pagination}
   * @defaultValue broker level config
   */
  cursorNumRows?: number;

  /**
   * Minimum number of groups to keep when trimming groups at the broker level for group-by queries (SSE only). Similar to `minSegmentGroupTrimSize` and `minServerGroupTrimSize` but applied at the broker reduce phase. Setting to a non-positive value disables broker-level trim.
   *
   * @defaultValue broker level config (default `5000`)
   */
  minBrokerGroupTrimSize?: number;

  /**
   * For multi-stage group-by queries, sets how many groups Pinot keeps when trimming intermediate-stage aggregation results. Provides the same override as the `mse_min_group_trim_size` aggregate hint.
   *
   * @defaultValue server level config (default `5000`)
   */
  mseMinGroupTrimSize?: number;

  /**
   * Threshold for group-by trimming at the broker level. Controls the maximum number of groups that can be held before trimming is triggered during the broker reduce phase.
   *
   * @defaultValue broker level config (default `1000000`)
   */
  groupTrimThreshold?: number;

  /**
   * For `GROUP BY` queries in the multi-stage engine, flushes partial group-by results when the accumulated number of groups reaches this threshold, bounding server memory usage for high-cardinality `GROUP BY` queries. When set to a positive value, enables the `StreamingGroupByCombineOperator`; when unset or `0`, uses the standard `GroupByCombineOperator`. Result trimming is disabled in streaming mode to prevent incorrect partial aggregates.
   *
   * @defaultValue broker level config `pinot.broker.mse.streaming.group.by.flush.threshold` when set to a positive value; otherwise `0` (disabled)
   */
  streamingGroupByFlushThreshold?: number;

  /**
   * When set to `true`, enables broker-side segment pruning for multi-stage leaf-stage routing. On the physical optimizer path, uses the broker default from `pinot.broker.multistage.use.broker.pruning`. On the logical planner path, uses the broker default from `pinot.broker.multistage.logical.planner.use.broker.pruning` for eligible non-partitioned leaves, partitioned leaves, and logical tables. Unsupported or pre-partitioned leaf shapes (e.g. colocated joins) fall back to unpruned routing. If Pinot cannot route the filter-bearing pruning request, it retries the query with unpruned routing instead of failing it.
   *
   * @see {@link https://docs.pinot.apache.org/build-with-pinot/querying-and-sql/query-execution-controls/query-options | Query Options: Broker Pruning}
   * @defaultValue `true` on both the physical optimizer path and the logical planner path (for eligible leaf stages)
   */
  useBrokerPruning?: boolean;

  /**
   * When `true`, enables index-based `DISTINCT` operators when applicable. Pinot routes eligible single-column `SELECT DISTINCT jsonExtractIndex(...)` queries to `JsonIndexDistinctOperator`, which reads distinct values directly from the JSON index instead of projecting every matching document. Also enables `InvertedIndexDistinctOperator` for eligible inverted-index-backed `DISTINCT` queries.
   *
   * @defaultValue false
   */
  useIndexBasedDistinctOperator?: boolean;

  /**
   * Only applies to `JsonIndexDistinctOperator`. When `true`, Pinot skips missing-path handling for index-based `SELECT DISTINCT jsonExtractIndex(...)`: it does not add the 4-arg default, does not add `NULL` when null handling is enabled, and does not throw `Illegal Json Path` when some matching docs do not contain the extracted path. Requires `useIndexBasedDistinctOperator=true`.
   */
  jsonIndexDistinctSkipMissingPath?: boolean;

  /**
   * Overrides the cost heuristic for `InvertedIndexDistinctOperator`. Pinot chooses the bitmap inverted-index path when `dictionaryCardinality * costRatio <= filteredDocCount`. Set to `0` to force the bitmap inverted-index path whenever the filter matches at least one row. Requires `useIndexBasedDistinctOperator=true`.
   */
  invertedIndexDistinctCostRatio?: number;

  /**
   * Maximum number of rows to scan across all segments in a `DISTINCT` query before early termination. When reached, the single-stage `DISTINCT` path stops scanning additional segments and returns partial results.
   *
   * @defaultValue `null/empty` (no limit)
   */
  maxRowsInDistinct?: number;

  /**
   * Maximum number of rows to scan in a `DISTINCT` query without producing any new distinct values before early termination. Useful when the distinct value set converges quickly. When reached, the single-stage `DISTINCT` path stops scanning and returns partial results.
   *
   * @defaultValue `null/empty` (no limit)
   */
  maxRowsWithoutChangeInDistinct?: number;

  /**
   * Wall-clock time budget in milliseconds for the combine operator in a `DISTINCT` query. When exceeded, the single-stage `DISTINCT` path returns partial results.
   *
   * @defaultValue `null/empty` (no limit)
   */
  maxExecutionTimeMsInDistinct?: number;
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
