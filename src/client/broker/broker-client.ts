import { SqlFormat } from '../../utils/format';
import type { Sql } from '../../utils/tag';
import { EPinotErrorType, PinotError } from '../errors/pinot';
import { QueryStats } from './query-stats';
import type { IPinotBrokerTransport } from './transport/types';
import type { IPinotValueParser } from './type-parsers/types';
import { UnsafeParser } from './type-parsers/unsafe';
import {
  DEFAULT_RETRYABLE_ERROR_CODES,
  EBrokerErrorCode,
  IPinotClient,
  IPinotPoolStats,
  NON_PINOT_OPTIONS,
  type IBrokerResponse,
  type IPinotQueryOptions,
  type IPinotRetryOptions,
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
  /**
   * Query retry options. Retries queries that fail with transient Pinot error
   * codes (e.g. `410 BROKER_RESOURCE_MISSING`).
   *
   * @defaultValue retries enabled for {@link DEFAULT_RETRYABLE_ERROR_CODES}
   */
  retry?: IPinotRetryOptions;
}

/**
 * Pinot DB client.
 *
 * @public
 */
export class PinotClient implements IPinotClient {
  private valueParser: IPinotValueParser;
  private readonly retry: Required<IPinotRetryOptions>;

  constructor(protected readonly deps: IPinotClientDeps) {
    this.valueParser = deps.valueParser ?? new UnsafeParser();
    this.retry = {
      maxRetries: deps.retry?.maxRetries ?? 2,
      retryDelayMs: deps.retry?.retryDelayMs ?? 100,
      backoffFactor: deps.retry?.backoffFactor ?? 2,
      retryableErrorCodes:
        deps.retry?.retryableErrorCodes ?? DEFAULT_RETRYABLE_ERROR_CODES,
    };
  }

  /**
   * Standard Pinot SQL endpoint.
   *
   * @private
   */
  private static ENDPOINTS = { sql: '/query/sql' };

  /**
   * Resolves after the given number of milliseconds.
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if a broker response contains a retryable Pinot error code.
   *
   * @private
   * @param response - Broker response.
   * @returns `true` if any exception matches a retryable error code.
   */
  private isRetryableResponse(response: IBrokerResponse): boolean {
    return (response.exceptions ?? []).some((exception) => {
      return this.retry.retryableErrorCodes.includes(exception.errorCode);
    });
  }

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
          bodyTimeout: queryTimeoutMs,
          headersTimeout: queryTimeoutMs,
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

    const requestOptions = {
      method: 'POST' as const,
      path: PinotClient.ENDPOINTS.sql,
      ...PinotClient.getTimeouts(options?.timeoutMs),
      options,
      body: JSON.stringify({
        sql,
        queryOptions,
        trace,
      }),
    };

    let response = await transport.request<IBrokerResponse>(requestOptions);

    for (
      let attempt = 1;
      attempt <= this.retry.maxRetries && this.isRetryableResponse(response);
      attempt++
    ) {
      await PinotClient.delay(
        this.retry.retryDelayMs * this.retry.backoffFactor ** (attempt - 1),
      );
      response = await transport.request<IBrokerResponse>(requestOptions);
    }

    if ((response.exceptions?.length ?? 0) > 0) {
      throw new PinotError({
        message: 'Pinot query exception.',
        code: EBrokerErrorCode.UNKNOWN,
        exceptions: response.exceptions,
        type: EPinotErrorType.SQL,
        data: {
          // Sometimes it can be undefined, but it shouldn't happen
          ...(response.resultTable
            ? {
                first: response.resultTable.rows.slice(0, 3),
                last: response.resultTable.rows.slice(-3),
              }
            : { response }),
          sql,
          queryOptions,
        },
      });
    }
    const { resultTable, ...statsRaw } = response;
    if (!resultTable) {
      throw new PinotError({
        message: 'Pinot query result table is empty.',
        code: EBrokerErrorCode.UNKNOWN,
        type: EPinotErrorType.UNKNOWN,
        data: {
          sql,
          queryOptions,
          response,
        },
      });
    }
    try {
      const {
        dataSchema: { columnNames, columnDataTypes },
        rows,
      } = resultTable;
      const queryStats = new QueryStats(statsRaw);

      const colCount = columnNames.length;
      const data = rows.map((row) => {
        const obj: Record<string, unknown> = {};

        for (let i = 0; i < colCount; i++) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          obj[columnNames[i]!] = this.valueParser.parse(
            row[i],
            columnDataTypes[i],
          );
        }

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
          // Sometimes it can be undefined, but it shouldn't happen
          ...(response.resultTable
            ? {
                first: response.resultTable.rows.slice(0, 3),
                last: response.resultTable.rows.slice(-3),
              }
            : { response }),
        },
      });
    }
  }
}
