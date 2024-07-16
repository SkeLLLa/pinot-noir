import type { Sql } from 'sql-template-tag';
import { SqlFormat } from '../../utils/format';
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

export class PinotClient implements IPinotClient {
  constructor(
    protected readonly deps: {
      transport: IPinotBrokerTransport;
    },
  ) {}

  private static ENDPOINTS = { sql: '/query/sql' };

  public get transportStats(): IPinotPoolStats {
    return this.deps.transport.stats;
  }

  public async select<TResult>(
    query: Sql,
    options?: IPinotQueryOptions,
    trace?: boolean,
  ): Promise<IQueryResult<TResult[]>> {
    const { transport } = this.deps;
    const sql = SqlFormat.format(query.sql, query.values);

    const response = await transport.request<IBrokerResponse>({
      method: 'POST',
      path: PinotClient.ENDPOINTS.sql,
      body: JSON.stringify({ sql, options, trace }),
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
          query,
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
          first: response.resultTable?.rows?.slice(0, 3),
          last: response.resultTable?.rows?.slice(-3),
        },
      });
    }
  }
}
