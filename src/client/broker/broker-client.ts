import { SqlFormat } from '../../utils/format';
import type { Sql } from '../../utils/tag';
import { EPinotErrorType, PinotError } from '../errors/pinot';
import type { IPinotBrokerTransport } from './transport/types';
import {
  EBrokerErrorCode,
  IPinotClient,
  IPinotPoolStats,
  type IBrokerResponse,
  type IPinotQueryOptions,
  type IQueryResult,
} from './types';

/**
 * Pinot DB client.
 *
 * @public
 */
export class PinotClient implements IPinotClient {
  constructor(
    protected readonly deps: {
      transport: IPinotBrokerTransport;
    },
  ) {}

  /**
   * Standard pinot sql endpoint
   *
   * @private
   */
  private static ENDPOINTS = { sql: '/query/sql' };

  /**
   * Converts and serializes query options to pinot supported fromat
   *
   * @public
   * @static
   *
   * @param options - Query options
   * @returns Seriialized options
   */
  public static toQueryOptions(
    options?: IPinotQueryOptions,
  ): string | undefined {
    return options
      ? Object.entries(options)
          .map((kv) => {
            return kv.join('=');
          })
          .join(';')
      : undefined;
  }

  /**
   * Transport stats.
   */
  public get transportStats(): IPinotPoolStats {
    return this.deps.transport.stats;
  }

  /**
   * Execute pinot sql query
   *
   * @public
   * @param query - Sql query body
   * @param options - Query options
   * @param trace - Pass trace parameter to pinot
   * @returns Result rows with stats
   */
  public async select<TResult>(
    query: Sql,
    options?: IPinotQueryOptions,
    trace?: boolean,
  ): Promise<IQueryResult<TResult[]>> {
    const { transport } = this.deps;
    const sql = SqlFormat.format(query.sql, query.values);
    const queryOptions = PinotClient.toQueryOptions(options);

    const response = await transport.request<IBrokerResponse>({
      method: 'POST',
      path: PinotClient.ENDPOINTS.sql,
      body: JSON.stringify({
        sql,
        queryOptions,
        trace,
      }),
    });

    if ((response.exceptions?.length ?? 0) > 0) {
      throw new PinotError({
        message: 'Pinot query exception',
        code: EBrokerErrorCode.UNKNOWN,
        exceptions: response.exceptions,
        type: EPinotErrorType.SQL,
        data: {
          first: response.resultTable?.rows?.slice(0, 3),
          last: response.resultTable?.rows?.slice(-3),
          sql,
          queryOptions,
        },
      });
    }

    try {
      const {
        resultTable: {
          dataSchema: { columnNames },
          rows,
        },
        numDocsScanned,
        numServersQueries,
        numSegmentsMatched,
        minConsumingFreshnessTimeMs,
        numConsumingSegmentsQueried,
        numEntriesScannedPostFilter,
        numGroupsLimitReached,
        numSegmentsProcessed,
        numSegmentsQueried,
        timeUsedMs,
        totalDocs,
        traceInfo,
        numServersResponded,
      } = response;

      const data = rows.map((row) => {
        const obj: Record<string, unknown> = {};

        columnNames.forEach((column, index) => {
          // TODO: add data types conversion
          obj[column] = row[index];
        });

        return obj as TResult;
      });

      return {
        sql,
        queryOptions,
        rows: data,
        stats: {
          traceInfo,
          segments: {
            matched: numSegmentsMatched,
            processed: numSegmentsProcessed,
            queried: numSegmentsQueried,
          },
          server: {
            queries: numServersQueries,
            responded: numServersResponded,
          },
          docs: {
            scanned: numDocsScanned,
            returned: data.length,
            total: totalDocs,
          },
          totalTimeMs: timeUsedMs,
          minConsumingFreshnessTimeMs,
          numConsumingSegmentsQueried,
          numEntriesScannedPostFilter,
          numGroupsLimitReached,
        },
      };
    } catch (error) {
      throw new PinotError({
        message: 'Pinot parse error',
        code: EBrokerErrorCode.UNKNOWN,
        type: EPinotErrorType.PARSE,
        cause: error as Error,
        data: {
          sql,
          queryOptions,
          first: response.resultTable?.rows?.slice(0, 3),
          last: response.resultTable?.rows?.slice(-3),
        },
      });
    }
  }
}
