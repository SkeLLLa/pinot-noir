import { SqlFormat } from '../../utils/format';
import type { Sql } from '../../utils/tag';
import { EPinotErrorType, PinotError } from '../errors/pinot';
import { QueryStats } from './query-stats';
import type { IPinotBrokerTransport } from './transport/types';
import type { IPinotValueParser } from './type-parsers/types';
import { UnsafeParser } from './type-parsers/unsafe';
import {
  EBrokerErrorCode,
  IPinotClient,
  IPinotPoolStats,
  NON_PINOT_OPTIONS,
  type IBrokerResponse,
  type IPinotQueryOptions,
  type IQueryResult,
} from './types';

/**
 * Pinot client dependencies.
 *
 * @public
 */
export interface IPinotClientDeps {
  /**
   * Pinot broker transport.
   */
  transport: IPinotBrokerTransport;
  /**
   * Value parser.
   *
   * @defaultValue {@link UnsafeParser}
   */
  valueParser?: IPinotValueParser;
}

/**
 * Pinot DB client.
 *
 * @public
 */
export class PinotClient implements IPinotClient {
  private valueParser: IPinotValueParser;

  constructor(protected readonly deps: IPinotClientDeps) {
    this.valueParser = deps.valueParser ?? new UnsafeParser();
  }

  /**
   * Standard Pinot SQL endpoint.
   *
   * @private
   */
  private static ENDPOINTS = { sql: '/query/sql' };

  /**
   * Converts and serializes query options to Pinot supported format.
   *
   * @public
   * @static
   *
   * @param options - Query options.
   * @returns Serialized options.
   */
  public static toQueryOptions(
    options?: IPinotQueryOptions,
  ): string | undefined {
    return options
      ? Object.entries(options)
          .filter(([k]) => {
            return !NON_PINOT_OPTIONS.includes(k as keyof IPinotQueryOptions);
          })
          .map((kv) => {
            return kv.join('=');
          })
          .join(';')
      : undefined;
  }

  /**
   * Gets timeouts for the query.
   *
   * @private
   * @param queryTimeoutMs - Query timeout in milliseconds.
   * @returns Object containing bodyTimeout and headersTimeout.
   */
  private static getTimeouts(queryTimeoutMs?: number): {
    bodyTimeout?: number;
    headersTimeout?: number;
  } {
    return queryTimeoutMs
      ? {
          bodyTimeout: queryTimeoutMs * 1.2 * 0.5,
          headersTimeout: queryTimeoutMs * 1.2 * 0.5,
        }
      : {};
  }

  /**
   * Transport stats.
   *
   * @public
   */
  public get transportStats(): IPinotPoolStats {
    return this.deps.transport.stats;
  }

  /**
   * Executes Pinot SQL query.
   *
   * @public
   * @param query - SQL query body.
   * @param options - Query options.
   * @param trace - Pass trace parameter to Pinot.
   * @returns Result rows with stats.
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
      ...PinotClient.getTimeouts(options?.timeoutMs),
      options,
      body: JSON.stringify({
        sql,
        queryOptions,
        trace,
      }),
    });

    if ((response.exceptions?.length ?? 0) > 0) {
      throw new PinotError({
        message: 'Pinot query exception.',
        code: EBrokerErrorCode.UNKNOWN,
        exceptions: response.exceptions,
        type: EPinotErrorType.SQL,
        data: {
          first: response.resultTable.rows.slice(0, 3),
          last: response.resultTable.rows.slice(-3),
          sql,
          queryOptions,
        },
      });
    }

    try {
      const {
        resultTable: {
          dataSchema: { columnNames, columnDataTypes },
          rows,
        },
        ...statsRaw
      } = response;
      const queryStats = new QueryStats(statsRaw);

      const data = rows.map((row) => {
        const obj: Record<string, unknown> = {};

        columnNames.forEach((column, index) => {
          obj[column] = this.valueParser.parse(
            row[index],
            columnDataTypes[index],
          );
        });

        return obj as TResult;
      });

      return {
        sql,
        queryOptions,
        rows: data,
        stats: queryStats,
      };
    } catch (error) {
      throw new PinotError({
        message: 'Pinot parse error.',
        code: EBrokerErrorCode.UNKNOWN,
        type: EPinotErrorType.PARSE,
        cause: error as Error,
        data: {
          sql,
          queryOptions,
          first: response.resultTable.rows.slice(0, 3),
          last: response.resultTable.rows.slice(-3),
        },
      });
    }
  }
}
