import { errors, Pool, type Dispatcher } from 'undici';
import { EPinotErrorType, PinotError } from '../../../errors/pinot';
import { IPinotPoolStats } from '../../types';
import {
  EBrokerTransportErrorCode,
  type IBrokerTransportConfig,
  type IBrokerTransportRequestOptions,
  type IPinotBrokerTransport,
} from '../types';

/**
 * Pinot broker JSON transport based on "undici" http client.
 *
 * @public
 */
export class PinotBrokerJSONTransport implements IPinotBrokerTransport {
  protected readonly pool: Pool;
  protected readonly token: string;

  constructor({
    bodyTimeout = 60000,
    brokerUrl,
    connections = undefined,
    connectTimeout = 1000,
    headersTimeout = 60000,
    keepAliveMaxTimeout = 60000,
    token,
  }: IBrokerTransportConfig) {
    this.pool = new Pool(brokerUrl, {
      connections: connections ?? null,
      bodyTimeout,
      pipelining: 1,
      keepAliveMaxTimeout,
      keepAliveTimeoutThreshold: 5000,
      headersTimeout,
      connect: {
        timeout: connectTimeout,
      },
    });
    this.token = token;
  }

  /**
   * Perform HTTP request to pinot
   *
   * @public
   * @param param0 - Request options
   * @returns Pinot response
   */

  async request<TResponse = unknown>({
    body,
    headers,
    method = 'POST',
    path,
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
      if (
        err instanceof errors.BodyTimeoutError ||
        err instanceof errors.ConnectTimeoutError ||
        err instanceof errors.ConnectTimeoutError
      ) {
        throw new PinotError({
          data: { body },
          message: `Pinot transport error: Timeout: ${err.message}`,
          type: EPinotErrorType.TRANSPORT,
          cause: err,
          code: EBrokerTransportErrorCode.TIMEOUT,
        });
      }
      throw new PinotError({
        data: { body },
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
      } catch {
        // failed to parse body
        body = undefined;
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

  /**
   * Closes connection to pinot broker
   */
  async close(): Promise<void> {
    return this.pool.close();
  }

  /**
   * HTTP pool statitstics
   */
  get stats(): IPinotPoolStats {
    return this.pool.stats;
  }
}
