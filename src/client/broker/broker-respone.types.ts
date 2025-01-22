/**
 * Available Pinot data types.
 *
 * @public
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
 * Response data schema.
 *
 * @public
 */
export interface IResponseSchema {
  /**
   * Type for each column. Can be used for proper data parsing.
   */
  columnDataTypes: TPinotDataType[];
  /**
   * Result column names.
   */
  columnNames: string[];
}

/**
 * Pinot result table.
 *
 * @public
 */
export interface IResultTable {
  /**
   * Schema that describes the schema of the response.
   */
  dataSchema: IResponseSchema;
  /**
   * Actual content with values.
   * This is an array of arrays.
   * The number of rows depends on the limit value in the query.
   * The number of columns in each row is equal to the length of resultTable.dataSchema.columnNames.
   */
  rows: (number | string)[][];
}

/**
 * Pinot exception.
 *
 * @public
 */
export interface IPinoException {
  /**
   * Pinot error code.
   */
  errorCode: number;
  /**
   * Error message.
   */
  message: string;
}

/**
 * Base interface for all stage stats.
 *
 * @public
 */
export interface IStageStatsBase {
  /**
   * Type of the operator.
   */
  type: string;
  /**
   * Execution time in milliseconds.
   */
  executionTimeMs: number;
  /**
   * Number of rows emitted by the operator.
   */
  emittedRows: number;
  /**
   * Child operators' stats.
   */
  children?: IStageStatsBase[];
}

/**
 * Stats for the AGGREGATE operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/aggregate#stats | Aggregate Stats}
 */
export interface IAggregateStats extends IStageStatsBase {
  type: 'AGGREGATE';
}

/**
 * Stats for the FILTER operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/filter#stats | Filter Stats}
 */
export interface IFilterStats extends IStageStatsBase {
  type: 'FILTER';
}

/**
 * Stats for the HASH_JOIN operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/hash-join#stats | Hash Join Stats}
 */
export interface IHashJoinStats extends IStageStatsBase {
  type: 'HASH_JOIN';
  /**
   * Time spent building the hash table in milliseconds.
   */
  timeBuildingHashTableMs: number;
}

/**
 * Stats for the LEAF operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/leaf#stats | Leaf Stats}
 */
export interface ILeafStats extends IStageStatsBase {
  type: 'LEAF';
  /**
   * Name of the table being scanned.
   */
  table: string;
  /**
   * Number of documents scanned.
   */
  numDocsScanned: number;
  /**
   * Total number of documents in the table.
   */
  totalDocs: number;
  /**
   * Number of entries scanned after the filtering phase.
   */
  numEntriesScannedPostFilter: number;
  /**
   * Number of segments queried.
   */
  numSegmentsQueried: number;
  /**
   * Number of segments processed.
   */
  numSegmentsProcessed: number;
  /**
   * Number of segments matched.
   */
  numSegmentsMatched: number;
  /**
   * Number of consuming segments queried.
   */
  numConsumingSegmentsQueried: number;
  /**
   * Minimum consuming freshness time in milliseconds.
   */
  minConsumingFreshnessTimeMs: number;
  /**
   * Number of segments pruned by the server.
   */
  numSegmentsPrunedByServer: number;
  /**
   * Thread CPU time in nanoseconds.
   */
  threadCpuTimeNs: number;
  /**
   * System activities CPU time in nanoseconds.
   */
  systemActivitiesCpuTimeNs?: number;
}

/**
 * Stats for the MAILBOX_RECEIVE operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/mailbox-receive#stats | Mailbox Receive Stats}
 */
export interface IMailboxReceiveStats extends IStageStatsBase {
  type: 'MAILBOX_RECEIVE';
  /**
   * Number of upstream operators.
   */
  fanIn: number;
  /**
   * Number of raw messages received.
   */
  rawMessages: number;
  /**
   * Number of bytes deserialized.
   */
  deserializedBytes: number;
  /**
   * Time spent deserializing messages in milliseconds.
   */
  deserializationTimeMs?: number;
  /**
   * Time spent waiting for downstream operators in milliseconds.
   */
  downstreamWaitMs?: number;
  /**
   * Time spent waiting for upstream operators in milliseconds.
   */
  upstreamWaitMs?: number;
  /**
   * Number of in-memory messages.
   */
  inMemoryMessages?: number;
}

/**
 * Stats for the MAILBOX_SEND operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/mailbox-send#stats | Mailbox Send Stats}
 */
export interface IMailboxSendStats extends IStageStatsBase {
  type: 'MAILBOX_SEND';
  /**
   * Stage number.
   */
  stage: number;
  /**
   * Number of parallel operators.
   */
  parallelism: number;
  /**
   * Number of downstream operators.
   */
  fanOut: number;
  /**
   * Number of raw messages sent.
   */
  rawMessages: number;
  /**
   * Number of bytes serialized.
   */
  serializedBytes: number;
  /**
   * Time spent serializing messages in milliseconds.
   */
  serializationTimeMs?: number;
  /**
   * Number of in-memory messages.
   */
  inMemoryMessages?: number;
}

/**
 * Stats for the SORT_OR_LIMIT operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/sort-or-limit#stats | Sort or Limit Stats}
 */
export interface ISortOrLimitStats extends IStageStatsBase {
  type: 'SORT_OR_LIMIT';
  /**
   * Indicates if sorting is required.
   */
  requireSort?: boolean;
}

/**
 * Stats for the TRANSFORM operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/transform#stats | Transform Stats}
 */
export interface ITransformStats extends IStageStatsBase {
  type: 'TRANSFORM';
}

/**
 * Stats for the WINDOW operator.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/user-guide-query/multi-stage-query/operator-types/window#stats | Window Stats}
 */
export interface IWindowStats extends IStageStatsBase {
  type: 'WINDOW';
}

/**
 * Union type for all stage stats.
 *
 * @public
 */
export type StageStats =
  | IAggregateStats
  | IFilterStats
  | IHashJoinStats
  | ILeafStats
  | IMailboxReceiveStats
  | IMailboxSendStats
  | ISortOrLimitStats
  | ITransformStats
  | IWindowStats;

/**
 * Broker response stats.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#broker-query-response-fields | Broker Response Stats}
 */
export interface IBrokerResponseStats {
  /**
   * Number of rows in the result set.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numrowsresultset | numRowsResultSet}
   */
  numRowsResultSet: number;
  /**
   * Indicates if the number of groups limit was reached.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numgroupslimitreached | numGroupsLimitReached}
   */
  numGroupsLimitReached: boolean;
  /**
   * Indicates if the maximum number of rows in join was reached.
   *
   * {@label MULTI_STAGE_ENGINE}
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#maxrowsinjoinreached | maxRowsInJoinReached}
   */
  maxRowsInJoinReached?: boolean;
  /**
   * Indicates if the maximum number of rows in window was reached.
   *
   * {@label MULTI_STAGE_ENGINE}
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#maxrowsinwindowreached | maxRowsInWindowReached}
   */
  maxRowsInWindowReached?: boolean;
  /**
   * Time used in milliseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#timeusedms | timeUsedMs}
   */
  timeUsedMs: number;
  /**
   * Stage stats.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#stagestats | stageStats}
   */
  stageStats: IStageStatsBase;
  /**
   * Maximum number of rows in operator.
   *
   * {@label MULTI_STAGE_ENGINE}
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#maxrowsinoperator | maxRowsInOperator}
   */
  maxRowsInOperator?: number;
  /**
   * Number of documents scanned.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numdocsscanned | numDocsScanned}
   */
  numDocsScanned: number;
  /**
   * Total number of documents.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#totaldocs | totalDocs}
   */
  totalDocs: number;
  /**
   * Number of entries scanned in filter.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numentriesscannedinfilter | numEntriesScannedInFilter}
   */
  numEntriesScannedInFilter: number;
  /**
   * Number of entries scanned post filter.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numentriesscannedpostfilter | numEntriesScannedPostFilter}
   */
  numEntriesScannedPostFilter: number;
  /**
   * Number of servers queried.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numserversqueried | numServersQueried}
   */
  numServersQueried: number;
  /**
   * Number of servers responded.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numserversresponded | numServersResponded}
   */
  numServersResponded: number;
  /**
   * Number of segments queried.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsqueried | numSegmentsQueried}
   */
  numSegmentsQueried: number;
  /**
   * Number of segments processed.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprocessed | numSegmentsProcessed}
   */
  numSegmentsProcessed: number;
  /**
   * Number of segments matched.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsmatched | numSegmentsMatched}
   */
  numSegmentsMatched: number;
  /**
   * Number of consuming segments queried.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numconsumingsegmentsqueried | numConsumingSegmentsQueried}
   */
  numConsumingSegmentsQueried: number;
  /**
   * Number of consuming segments processed.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numconsumingsegmentsprocessed | numConsumingSegmentsProcessed}
   */
  numConsumingSegmentsProcessed: number;
  /**
   * Number of consuming segments matched.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numconsumingsegmentsmatched | numConsumingSegmentsMatched}
   */
  numConsumingSegmentsMatched: number;
  /**
   * Minimum consuming freshness time in milliseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#minconsumingfreshnesstimems | minConsumingFreshnessTimeMs}
   */
  minConsumingFreshnessTimeMs: number;
  /**
   * Number of segments pruned by broker.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprunedbybroker | numSegmentsPrunedByBroker}
   */
  numSegmentsPrunedByBroker: number;
  /**
   * Number of segments pruned by server.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprunedbyserver | numSegmentsPrunedByServer}
   */
  numSegmentsPrunedByServer: number;
  /**
   * Number of segments pruned invalid.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprunedinvalid | numSegmentsPrunedInvalid}
   */
  numSegmentsPrunedInvalid: number;
  /**
   * Number of segments pruned by limit.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprunedbylimit | numSegmentsPrunedByLimit}
   */
  numSegmentsPrunedByLimit: number;
  /**
   * Number of segments pruned by value.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#numsegmentsprunedbyvalue | numSegmentsPrunedByValue}
   */
  numSegmentsPrunedByValue: number;
  /**
   * Broker reduce time in milliseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#brokerreducetimems | brokerReduceTimeMs}
   * @see {@link https://github.com/apache/pinot/pull/11142 | Broker reduce time PR}
   */
  brokerReduceTimeMs: number;
  /**
   * Offline thread CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#offlinethreadcputimens | offlineThreadCpuTimeNs}
   */
  offlineThreadCpuTimeNs: number;
  /**
   * Realtime thread CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#realtimethreadcputimens | realtimeThreadCpuTimeNs}
   */
  realtimeThreadCpuTimeNs: number;
  /**
   * Offline system activities CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#offlinesystemactivitiescputimens | offlineSystemActivitiesCpuTimeNs}
   */
  offlineSystemActivitiesCpuTimeNs: number;
  /**
   * Realtime system activities CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#realtimesystemactivitiescputimens | realtimeSystemActivitiesCpuTimeNs}
   */
  realtimeSystemActivitiesCpuTimeNs: number;
  /**
   * Offline response serialization CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#offlineresponseserializationcputimens | offlineResponseSerializationCpuTimeNs}
   */
  offlineResponseSerializationCpuTimeNs: number;
  /**
   * Realtime response serialization CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#realtimeresponseserializationcputimens | realtimeResponseSerializationCpuTimeNs}
   */
  realtimeResponseSerializationCpuTimeNs: number;
  /**
   * Offline total CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#offlinetotalcputimens | offlineTotalCpuTimeNs}
   */
  offlineTotalCpuTimeNs: number;
  /**
   * Realtime total CPU time in nanoseconds.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#realtimetotalcputimens | realtimeTotalCpuTimeNs}
   */
  realtimeTotalCpuTimeNs: number;
  /**
   * Number of empty filter segments in explain plan.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#explainplannumemptyfiltersegments | explainPlanNumEmptyFilterSegments}
   */
  explainPlanNumEmptyFilterSegments: number;
  /**
   * Number of match all filter segments in explain plan.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#explainplannummatchallfiltersegments | explainPlanNumMatchAllFilterSegments}
   */
  explainPlanNumMatchAllFilterSegments: number;
}

/**
 * Broker response.
 *
 * @public
 *
 * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#broker-query-response-fields | Broker Response}
 */
export interface IBrokerResponse extends IBrokerResponseStats {
  /**
   * Request ID.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#requestid | requestId}
   */
  requestId: string;
  /**
   * Broker ID.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#brokerid | brokerId}
   */
  brokerId: string;
  /**
   * List of exceptions.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#exceptions | exceptions}
   */
  exceptions: IPinoException[];
  /**
   * Indicates if the result is partial.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#partialresult | partialResult}
   * @see {@link https://github.com/apache/pinot/pull/11592 | Partial results PR}
   */
  partialResult: boolean;
  /**
   * Broker response stats.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#broker-query-response-fields | stats}
   */
  stats: IBrokerResponseStats;
  /**
   * Result table.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#resulttable | resultTable}
   */
  resultTable: IResultTable;
  /**
   * Trace information.
   *
   * @see {@link https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql/response-format#traceinfo | traceInfo}
   */
  traceInfo?: Record<string, unknown>;
}
