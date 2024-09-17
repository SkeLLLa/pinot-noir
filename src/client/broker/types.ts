import type PoolStats from 'undici/types/pool-stats';
import type { Sql } from '../../utils/tag';

/**
 * Pinot transport pool statistics
 *
 * @public
 */
export interface IPinotPoolStats extends PoolStats {
  //
}

/**
 * Response data schema
 *
 * @public
 */

export interface IResponseSchema {
  /**
   * Type for each column. Can be used for proper data parsing.
   */
  columnDataTypes: string[];
  /**
   * Result column names
   **/
  columnNames: string[];
}

/**
 * Pinot result table
 *
 * @public
 */
export interface IResultTable {
  /**
   * Schema that describes the schema of the response
   */
  dataSchema: IResponseSchema;
  /**
   * Actual content with values.
   * This is an array of arrays.
   * The number of rows depends on the limit value in the query.
   * The number of columns in each row is equal to the length of resultTable.dataSchema.columnNames
   */
  rows: (number | string)[][];
}

/**
 * Pinot exception
 *
 * @public
 */
export interface IPinoException {
  /**
   * Pinot error code
   */
  errorCode: number;
  /**
   * Error message
   */
  message: string;
}

/**
 * Available Pinot data types
 */
export type TPinotDataType =
  | 'INT'
  | 'LONG'
  | 'FLOAT'
  | 'DOUBLE'
  | 'BIG_DECIMAL'
  | 'BOOLEAN'
  | 'TIMESTAMP'
  | 'STRING'
  | 'JSON'
  | 'BYTES';

/**
 * Pinot broker response
 *
 * @public
 * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format | pinot response format docs} for detailed description
 */
export interface IBrokerResponse {
  /**
   * Result table
   */
  resultTable: IResultTable;
  /**
   * Query exceptions.
   * Will contain the stack trace if there is any exception processing the query.
   */
  exceptions?: IPinoException[];
  /**
   * Query trace, if the query was executed with `trace`
   */
  traceInfo: Record<string, string>;
  /**
   * Represents the number of servers queried by the broker (may be less than the total number of servers since the broker can apply some optimizations to minimize the number of servers).
   */
  numServersQueries: number;
  /**
   * This should be equal to the numServersQueried. If this is not the same, then one of more servers might have timed out.
   * If numServersQueried != numServersResponded, the results can be considered partial and clients can retry the query with exponential back off.
   */
  numServersResponded: number;
  /**
   * The total number of segmentsQueried for a query.
   * May be less than the total number of segments if the broker applies optimizations.
   *
   * The broker decides how many segments to query on each server, based on broker pruning logic.
   * The server decides how many of these segments to actually look at, based on server pruning logic.
   * After processing segments for a query, fewer may have the matching records.
   *
   * In general, `numSegmentsQueried >= numSegmentsProcessed >= numSegmentsMatched`.
   */
  numSegmentsQueried: number;
  /**
   * The number of segment operators used to process segments.
   * Indicates the effectiveness of the pruning logic. For more information, see
   *
   * @see {@link https://docs.pinot.apache.org/users/user-guide-query/query-syntax/explain-plan | Single-stage query engine} for more info
   * @see {@link https://docs.pinot.apache.org/users/user-guide-query/query-syntax/explain-plan-multi-stage | Multi-stage query engine} for more info
   */
  numSegmentsProcessed: number;
  /**
   * The number of segments processed with at least one document matched in the query response.
   */
  numSegmentsMatched: number;
  numConsumingSegmentsQueried: number;
  /**
   * Total number of docs scanned
   */
  numDocsScanned: number;

  /**
   * The number of entries scanned after the filtering phase of query execution, ie. aggregation and/or group-by phases.
   * This is equivalent to numDocScanned * number of projected columns.
   * This along with numEntriesScannedInFilter indicates where most of the time is spent during query processing.
   * A high number for this means the selectivity is low (that is, Pinot needs to scan a lot of records to answer the query).
   * If this is high, consider using star-tree index. (A regular inverted/bitmap index won't improve performance.)
   */
  numEntriesScannedPostFilter: number;
  /**
   * If the query has a group by clause and top K, Pinot drops new entries after the numGroupsLimit is reached.
   * If this boolean is set to true, the query result may not be accurate.
   * The default value for numGroupsLimit is 100k, and should be sufficient for most use cases.
   */
  numGroupsLimitReached: boolean;
  /**
   * Number of documents/records in the table.
   */
  totalDocs: number;
  /**
   * Total time taken as seen by the broker before sending the response back to the client.
   */
  timeUsedMs: number;
  minConsumingFreshnessTimeMs: number;
}

/**
 * Pinot query statistics.
 * Just converted and categorized pinot response stats
 */
export interface IQueryStats {
  /**
   * Tracing info
   */
  traceInfo: Record<string, string>;
  /**
   * Segment stats
   */
  segments: {
    queried: number;
    processed: number;
    matched: number;
  };
  /**
   * Server stats
   */
  server: {
    queries: number;
    responded: number;
  };
  /**
   * Docs stats
   */
  docs: {
    scanned: number;
    returned: number;
    total: number;
  };
  /**
   * Query time in ms
   */
  totalTimeMs: number;

  minConsumingFreshnessTimeMs: number;
  numConsumingSegmentsQueried: number;
  numEntriesScannedPostFilter: number;
  numGroupsLimitReached: boolean;
}

/**
 * Query result
 */
export interface IQueryResult<TRows = unknown> {
  /**
   * Data rows
   */
  rows: TRows;
  /**
   * Query stats
   */
  stats: IQueryStats;
  /**
   * Compiled SQL query
   */
  sql: string;
  /**
   * Query options
   */
  queryOptions?: string | undefined;
}

// TODO: add some codes
/**
 * Broker error codes
 */
export const enum EBrokerErrorCode {
  /**
   * Unknown
   */
  UNKNOWN,
}

/**
 * Query options
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

  /** Which indexes to skip usage of, per-column. Format: `col1=indexType1,indexType2&col2=indexType1`. */
  skipIndexes?: string;

  /** For upsert-enabled table, skip the effect of upsert and query all records. */
  skipUpsert?: boolean;

  /** Use star-tree index if available. (introduced in 0.11.0) */
  useStarTree?: boolean;

  /** Enable scan reordering for AND clauses. */
  andScanReordering?: boolean;

  /** Maximum rows allowed in join hash-table creation phase. */
  maxRowsInJoin?: number;

  /** Indicates that the values in the IN clause are already sorted. */
  inPredicatePreSorted?: boolean;

  /** Algorithm to use to look up the dictionary ids for the IN clause values. */
  inPredicateLookupAlgorithm?:
    | 'DIVIDE_BINARY_SEARCH'
    | 'SCAN'
    | 'PLAIN_BINARY_SEARCH';

  /** Maximum length of the serialized response per server for a query. */
  maxServerResponseSizeBytes?: number;

  /** Maximum serialized response size across all servers for a query. */
  maxQueryResponseSizeBytes?: number;
}

/**
 * Pinot client interface.
 */
export interface IPinotClient {
  /**
   * Execute pinot sql query
   *
   * @public
   * @param query Sql query body
   * @param options Query options
   * @param trace Pass trace parameter to pinot
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
