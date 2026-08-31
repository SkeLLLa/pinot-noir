import { errors, Pool, type Dispatcher } from 'undici';

import { EPinotErrorType, PinotError } from '../../../errors/pinot';
import type { IPinotPoolStats } from '../../types';
import {
  EBrokerTransportErrorCode,
  type IBrokerTransportConfig,
  type IBrokerTransportRequestOptions,
  type IPinotBrokerTransport,
} from '../types';

/**
 * Pinot broker JSON transport based on "undici" HTTP client.
 *
 * @public
 */
export class PinotBrokerJSONTransport implements IPinotBrokerTransport {
  /**
   * HTTP client pool.
   */
  protected readonly pool: Pool;
  /**
   * Pinot broker auth token.
   */
  protected readonly token: string;
  /**
   * Precomputed `authorization` header value (scheme + token).
   */
  protected readonly authHeader: string;
  /**
   * Maximum query queue size.
   */
  protected maxQueueSize: number | undefined;

  constructor({
    bodyTimeout = 60000,
    brokerUrl,
    connections,
    // connectTimeout = 1000,
    keepAliveTimeout = 60000,
    headersTimeout = 60000,
    keepAliveMaxTimeout = 600000,
    token,
    authScheme = 'Basic',
    maxQueueSize,
  }: IBrokerTransportConfig) {
    this.pool = new Pool(brokerUrl, {
      connections: connections ?? null,
      bodyTimeout,
      pipelining: 1,
      keepAliveMaxTimeout,
      keepAliveTimeoutThreshold: 5000,
      headersTimeout,
      keepAliveTimeout,
      allowH2: false,
      // connect: {
      //   timeout: connectTimeout,
      // },
    });
    this.token = token;
    this.authHeader = `${authScheme} ${token}`;
    this.maxQueueSize = maxQueueSize;
  }
  /**
   * Set maximum query queue size.
   * @param size - new queue size
   */
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = size;
  }

  /**
   * Perform HTTP request to Pinot.
   *
   * @public
   * @param param0 - Request options.
   * @returns Pinot response.
   */
  async request<TResponse = unknown>({
    body,
    headers,
    method,
    path,
    query,
    options,
    bodyTimeout,
    headersTimeout,
  }: IBrokerTransportRequestOptions): Promise<TResponse> {
    const queueSize = this.pool.stats.queued;
    const maxQueueTolerance =
      this.maxQueueSize && options?.queueTolerance !== undefined
        ? this.maxQueueSize * options.queueTolerance
        : this.maxQueueSize;
    if (maxQueueTolerance && queueSize >= maxQueueTolerance) {
      // Throw error
      throw new PinotError({
        data: { body, maxQueueTolerance, queueSize },
        message: `Pinot transport error: Max queue size reached.`,
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.QUEUE_TOLERANCE_LIMIT,
      });
    }

    const reqOptions: Dispatcher.RequestOptions = {
      method,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'authorization': this.authHeader,
      },
      bodyTimeout: bodyTimeout ?? null,
      headersTimeout: headersTimeout ?? null,
      path,
      body: body ?? null,
      query: query ?? {},
    };

    const response = await this.pool
      .request(reqOptions)
      .catch((err: unknown) => {
        if (
          err instanceof errors.BodyTimeoutError ||
          err instanceof errors.ConnectTimeoutError ||
          err instanceof errors.HeadersTimeoutError
        ) {
          throw new PinotError({
            data: { body },
            message: `Pinot transport error: Timeout: ${err.message}`,
            type: EPinotErrorType.TRANSPORT,
            cause: err,
            code: EBrokerTransportErrorCode.TIMEOUT,
          });
        }
        if (err instanceof errors.ResponseError) {
          throw new PinotError({
            message: `Pinot transport error: Response code ${err.statusCode.toString()}`,
            type: EPinotErrorType.TRANSPORT,
            code: EBrokerTransportErrorCode.INVALID_RESPONSE,
            data: {
              headers: err.headers,
              body: err.body,
              statusCode: err.statusCode,
            },
          });
        }
        if (err instanceof Error) {
          throw new PinotError({
            data: { body },
            message: `Pinot transport error: ${err.message}`,
            type: EPinotErrorType.TRANSPORT,
            cause: err,
            code: EBrokerTransportErrorCode.UNKNOWN,
          });
        }
        throw new PinotError({
          data: { body, err },
          message: `Pinot transport error: unknown`,
          type: EPinotErrorType.TRANSPORT,
          code: EBrokerTransportErrorCode.UNKNOWN,
        });
      });

    try {
      const raw = (await response.body.json()) as TResponse;

      return raw;
    } catch (err) {
      const text = await response.body.text().catch((textErr: unknown) => {
        throw new PinotError({
          message: `Pinot transport error: Can't read response body.`,
          type: EPinotErrorType.TRANSPORT,
          code: EBrokerTransportErrorCode.INVALID_RESPONSE,
          cause: textErr as Error,
        });
      });

      throw new PinotError({
        message: `Pinot transport error: Can't parse response body JSON.`,
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        cause: err as Error,
        data: { body: text },
      });
    }
  }

  /**
   * Closes connection to Pinot broker.
   */
  async close(): Promise<void> {
    return this.pool.close();
  }

  /**
   * HTTP pool statistics.
   */
  get stats(): IPinotPoolStats {
    return this.pool.stats;
  }
}
