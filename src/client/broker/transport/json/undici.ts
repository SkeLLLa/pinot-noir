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
    const queueTolerance = options?.queueTolerance ?? 1;
    if (!Number.isFinite(queueTolerance) || queueTolerance < 0) {
      throw new TypeError(
        'Queue tolerance must be a finite, non-negative number.',
      );
    }
    const maxQueueTolerance = this.maxQueueSize
      ? this.maxQueueSize * queueTolerance
      : undefined;
    if (
      maxQueueTolerance !== undefined &&
      (queueTolerance === 0 ? queueSize > 0 : queueSize >= maxQueueTolerance)
    ) {
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

    return readResponse<TResponse>(response);
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

const MAX_ERROR_BODY_LENGTH = 1000;

function hasExceptions(response: unknown): boolean {
  const exceptions = (response as { exceptions?: unknown } | null)?.exceptions;
  return Array.isArray(exceptions) && exceptions.length > 0;
}

async function readResponse<TResponse>({
  statusCode,
  body: responseBody,
}: Dispatcher.ResponseData): Promise<TResponse> {
  const isSuccess = statusCode >= 200 && statusCode < 300;
  const text = await responseBody.text().catch((err: unknown) => {
    throw new PinotError({
      message: `Pinot transport error: Can't read response body.`,
      type: EPinotErrorType.TRANSPORT,
      code: EBrokerTransportErrorCode.INVALID_RESPONSE,
      cause: err as Error,
      data: { statusCode },
    });
  });
  const data = { statusCode, body: text.slice(0, MAX_ERROR_BODY_LENGTH) };

  try {
    const parsed = JSON.parse(text) as TResponse;
    // Pinot can report query exceptions with a non-2xx status; let the client raise them.
    if (isSuccess || hasExceptions(parsed)) {
      return parsed;
    }
  } catch (err) {
    if (isSuccess) {
      throw new PinotError({
        message: `Pinot transport error: Can't parse response body JSON.`,
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        cause: err as Error,
        data,
      });
    }
  }

  throw new PinotError({
    message: `Pinot transport error: Response code ${statusCode.toString()}`,
    type: EPinotErrorType.TRANSPORT,
    code: EBrokerTransportErrorCode.INVALID_RESPONSE,
    data,
  });
}
