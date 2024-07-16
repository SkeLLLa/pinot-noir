import { Pool, type Dispatcher } from 'undici';
import { EPinotErrorType, PinotError } from '../../../errors/pinot';
import { IPinotPoolStats } from '../../types';
import {
  EBrokerTransportErrorCode,
  type IBrokerTransportConfig,
  type IBrokerTransportRequestOptions,
  type IPinotBrokerTransport,
} from '../types';

export class PinotBrokerJSONTransport implements IPinotBrokerTransport {
  protected readonly pool: Pool;
  protected readonly token: string;

  constructor({
    brokerUrl,
    token,
    bodyTimeout = 60000,
    connections = 1024,
    keepAliveMaxTimeout = 60000,
  }: IBrokerTransportConfig) {
    this.pool = new Pool(brokerUrl, {
      connections,
      bodyTimeout,
      pipelining: 1,
      keepAliveMaxTimeout,
      keepAliveTimeoutThreshold: 5000,
    });
    this.token = token;
  }

  async request<TResponse = unknown>({
    method = 'POST',
    headers,
    path,
    body,
    query,
  }: IBrokerTransportRequestOptions): Promise<TResponse> {
    const reqOptions: Dispatcher.RequestOptions = {
      method,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'authorization': `Basic ${this.token}`,
      },
      path,
      body: body ?? null,
      query: query ?? {},
      // To handle status codes manually
      throwOnError: false,
    };

    const response = await this.pool.request(reqOptions).catch((err: Error) => {
      throw new PinotError({
        message: `Pinot transport error: ${err.message}`,
        type: EPinotErrorType.TRANSPORT,
        cause: err,
        code: EBrokerTransportErrorCode.UNKNOWN,
      });
    });

    if (response.statusCode !== 200) {
      let body: string | undefined;
      try {
        body = await response.body.text();
      } catch (error) {
        // do nothing
      }

      throw new PinotError({
        message: `Pinot transport error: response code ${response.statusCode}`,
        type: EPinotErrorType.TRANSPORT,
        code: response.statusCode,
        data: {
          headers: response.headers,
          body,
        },
      });
    }

    try {
      const raw = (await response.body.json()) as TResponse;

      return raw;
    } catch (err) {
      const text = await response.body.text().catch((err: Error) => {
        throw new PinotError({
          message: `Pinot transport error: can't read response body`,
          type: EPinotErrorType.TRANSPORT,
          code: EBrokerTransportErrorCode.INVALID_RESPONSE,
          cause: err,
        });
      });

      throw new PinotError({
        message: `Pinot transport error: can't parse response body JSON`,
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.INVALID_RESPONSE,
        cause: err as Error,
        data: { body: text },
      });
    }
  }

  async close(): Promise<void> {
    return this.pool.close();
  }

  get stats(): IPinotPoolStats {
    return this.pool.stats;
  }
}
