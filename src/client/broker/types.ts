import type { Sql } from 'sql-template-tag';
import type PoolStats from 'undici/types/pool-stats';

export interface IResponseSchema {
  columnDataTypes: string[];
  columnNames: string[];
}

export interface IResultTable {
  dataSchema: IResponseSchema;
  rows: (number | string)[][];
}

export interface IPinoException {
  errorCode: number;
  message: string;
}

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

export interface IBrokerResponse {
  resultTable: IResultTable;
  /**
   * Will contain the stack trace if there is any exception processing the query.
   */
  exceptions?: IPinoException[];
  traceInfo: Record<string, string>;
  numServersQueries: number;
  numServersResponded: number;
  numSegmentsQueried: number;
  numSegmentsProcessed: number;
  numSegmentsMatched: number;
  numConsumingSegmentsQueried: number;
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
  totalDocs: number;
  timeUsedMs: number;
  minConsumingFreshnessTimeMs: number;
}

export interface IQueryStats {
  traceInfo: Record<string, string>;

  segments: {
    queried: number;
    processed: number;
    matched: number;
  };
  server: {
    queries: number;
    responded: number;
  };
  docs: {
    scanned: number;
    returned: number;
    total: number;
  };
  totalTimeMs: number;

  minConsumingFreshnessTimeMs: number;
  numConsumingSegmentsQueried: number;
  numEntriesScannedPostFilter: number;
  numGroupsLimitReached: boolean;
}

export interface IQueryResult<TRows = unknown> {
  rows: TRows;
  stats: IQueryStats;
}

// TODO: add some codes
export const enum EBrokerErrorCode {
  UNKNOWN,
}

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

export interface IPinotClient {
  select<TResult>(query: Sql): Promise<IQueryResult<TResult[]>>;
  transportStats: PoolStats;
}
