import { Dispatcher } from 'undici';
import { IPinotPoolStats } from '../types';

/**
 * Pinot broker transport config options
 *
 * @public
 */
export interface IBrokerTransportConfig {
  /**
   * Broker URL
   */
  brokerUrl: URL | string;
  /**
   * Pinot API access token
   */
  token: string;
  /**
   * The timeout after which a request will time out, in milliseconds
   */
  bodyTimeout?: number;
  /**
   * Connection keep-alive timeout
   */
  keepAliveTimeout?: number;
  /**
   * Max pool connections. `undefined` = unlimited.
   *
   * @defaultValue undefined (unlimited)
   */
  connections?: number;
  /**
   * The maximum allowed `keepAliveTimeout`
   */
  keepAliveMaxTimeout?: number;
}

/**
 * Pinot broker HTTP request options
 *
 * @public
 */
export interface IBrokerTransportRequestOptions
  extends Pick<
    Dispatcher.RequestOptions,
    'method' | 'headers' | 'path' | 'body' | 'query'
  > {}

/**
 * Pinot broker transport interface. Implement it create your own.
 *
 * @public
 */
export interface IPinotBrokerTransport {
  /**
   * Perform HTTP request to pinot
   *
   * @public
   * @param param0 - Request options
   * @returns Pinot response
   */
  request<TResponse = unknown>({
    method,
    headers,
    path,
    body,
    query,
  }: IBrokerTransportRequestOptions): Promise<TResponse>;
  /**
   * Closes connection to pinot broker
   */
  close(): Promise<void>;
  /**
   * Pool statitstics (number of in-flight requests and so on)
   */
  stats: IPinotPoolStats;
}

/**
 * Broker error codes
 */
export const enum EBrokerTransportErrorCode {
  /**
   * Unknown code
   */
  UNKNOWN,
  /**
   * Invalid response from pinot
   */
  INVALID_RESPONSE,
}
