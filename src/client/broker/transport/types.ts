import { Dispatcher } from 'undici';
import { IncomingHttpHeaders } from 'undici/types/header';
import { IPinotPoolStats, TQueueTolerancePredefined } from '../types';

/**
 * Pinot broker transport config options.
 *
 * @public
 */
export interface IBrokerTransportConfig {
  /**
   * Broker URL.
   */
  brokerUrl: URL | string;
  /**
   * Pinot API access token.
   */
  token: string;
  /**
   * The timeout after which a request will time out (in ms).
   *
   * @defaultValue 60000
   */
  bodyTimeout?: number;
  /**
   * Connection keep-alive timeout.
   */
  keepAliveTimeout?: number;
  /**
   * Max pool connections. `undefined` = unlimited.
   *
   * @defaultValue undefined (unlimited)
   */
  connections?: number;
  /**
   * The maximum allowed `keepAliveTimeout` (in ms).
   *
   * @defaultValue 60000
   */
  keepAliveMaxTimeout?: number;
  /**
   * TCP connect timeout (in ms).
   *
   * @defaultValue 1000
   */
  connectTimeout?: number;
  /**
   * Headers timeout (in ms).
   *
   * @defaultValue 1000
   */
  headersTimeout?: number;
  /**
   * Max pool queue size. If undefined or 0, queue is infinite.
   * If a request comes and queue is already at maximum size it will be discarded with LIMIT_EXCEEDED error.
   *
   * @defaultValue value undefined
   */
  maxQueueSize?: number;
}

/**
 * Pinot broker HTTP request options.
 *
 * @public
 */
export interface IBrokerTransportRequestOptions
  extends Pick<
    Dispatcher.RequestOptions,
    | 'method'
    | 'headers'
    | 'path'
    | 'body'
    | 'query'
    | 'bodyTimeout'
    | 'headersTimeout'
  > {
  options?:
    | {
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        queueTolerance?: TQueueTolerancePredefined | number | undefined;
      }
    | undefined;
  headers?: Record<string, string | string[]> | IncomingHttpHeaders;
}

/**
 * Pinot broker transport interface. Implement it to create your own.
 *
 * @public
 */
export interface IPinotBrokerTransport {
  /**
   * Perform HTTP request to Pinot.
   *
   * @public
   * @param param0 - Request options.
   * @returns Pinot response.
   */
  request<TResponse = unknown>({
    method,
    headers,
    path,
    body,
    query,
  }: IBrokerTransportRequestOptions): Promise<TResponse>;
  /**
   * Closes connection to Pinot broker.
   */
  close(): Promise<void>;
  /**
   * Pool statistics (number of in-flight requests and so on).
   */
  stats: IPinotPoolStats;
  /**
   * Set maximum query queue size.
   * @param size - new queue size
   */
  setMaxQueueSize(size: number): void;
}

/**
 * Broker error codes.
 *
 * @public
 */
export const enum EBrokerTransportErrorCode {
  /**
   * Unknown code.
   */
  UNKNOWN,
  /**
   * Invalid response from Pinot.
   */
  INVALID_RESPONSE,
  /**
   * Timeout.
   */
  TIMEOUT,
  /**
   * Queue tolerance limit exceeded.
   */
  QUEUE_TOLERANCE_LIMIT,
}
