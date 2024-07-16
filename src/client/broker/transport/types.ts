import { Dispatcher } from 'undici';
import PoolStats from 'undici/types/pool-stats';

export interface IBrokerTransportConfig {
  brokerUrl: URL | string;
  token: string;
  bodyTimeout?: number;
  keepAliveTimeout?: number;
  /**
   * Max pool connections. `undefined` = unlimited.
   * @defaultValue undefined (unlimited)
   */
  connections?: number;
  keepAliveMaxTimeout?: number;
}

export interface IBrokerTransportRequestOptions
  extends Pick<
    Dispatcher.RequestOptions,
    'method' | 'headers' | 'path' | 'body' | 'query'
  > {}
export interface IPinotBrokerTransport {
  request<TResponse = unknown>({
    method,
    headers,
    path,
    body,
    query,
  }: IBrokerTransportRequestOptions): Promise<TResponse>;
  close(): Promise<void>;
  stats: PoolStats;
}

export const enum EBrokerTransportErrorCode {
  UNKNOWN,
  INVALID_RESPONSE,
}
