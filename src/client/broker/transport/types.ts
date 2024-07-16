import { Dispatcher } from 'undici';
import { IPinotPoolStats } from '../types';

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
  stats: IPinotPoolStats;
}

export const enum EBrokerTransportErrorCode {
  UNKNOWN,
  INVALID_RESPONSE,
}
