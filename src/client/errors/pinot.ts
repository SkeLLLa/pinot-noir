/**
 * Pinot error types
 */
export enum EPinotErrorType {
  UNKNOWN,
  TRANSPORT,
  SQL,
  PARSE,
}

/**
 * Pinot query error codes.
 *
 * Mirrors Apache Pinot's `QueryErrorCode` enum.
 *
 * @see {@link https://github.com/apache/pinot/blob/master/pinot-spi/src/main/java/org/apache/pinot/spi/exception/QueryErrorCode.java | QueryErrorCode.java}
 *
 * @public
 */
export enum ERROR_CODES {
  JSON_PARSING_ERROR_CODE = 100,
  SQL_PARSING_ERROR_CODE = 150,
  TIMESERIES_PARSING_ERROR_CODE = 155,
  SQL_RUNTIME_ERROR_CODE = 160,
  ACCESS_DENIED_ERROR_CODE = 180,
  TABLE_DOES_NOT_EXIST_ERROR_CODE = 190,
  TABLE_IS_DISABLED_ERROR_CODE = 191,
  QUERY_EXECUTION_ERROR_CODE = 200,
  SERVER_SHUTTING_DOWN_ERROR_CODE = 210,
  SERVER_OUT_OF_CAPACITY_ERROR_CODE = 211,
  SERVER_TABLE_MISSING_ERROR_CODE = 230,
  SERVER_SEGMENT_MISSING_ERROR_CODE = 235,
  QUERY_SCHEDULING_TIMEOUT_ERROR_CODE = 240,
  SERVER_RESOURCE_LIMIT_EXCEEDED_ERROR_CODE = 245,
  QUERY_SCAN_LIMIT_EXCEEDED_ERROR_CODE = 246,
  EXECUTION_TIMEOUT_ERROR_CODE = 250,
  BROKER_SEGMENT_UNAVAILABLE_ERROR_CODE = 305,
  BROKER_TIMEOUT_ERROR_CODE = 400,
  BROKER_RESOURCE_MISSING_ERROR_CODE = 410,
  BROKER_INSTANCE_MISSING_ERROR_CODE = 420,
  BROKER_REQUEST_SEND_ERROR_CODE = 425,
  SERVER_NOT_RESPONDING_ERROR_CODE = 427,
  // Pinot also defines `WORKLOAD_BUDGET_EXCEEDED` at 429 as an alias.
  TOO_MANY_REQUESTS_ERROR_CODE = 429,
  INTERNAL_ERROR_CODE = 450,
  MERGE_RESPONSE_ERROR_CODE = 500,
  QUERY_CANCELLATION_ERROR_CODE = 503,
  REMOTE_CLUSTER_UNAVAILABLE_ERROR_CODE = 510,
  QUERY_VALIDATION_ERROR_CODE = 700,
  UNKNOWN_COLUMN_ERROR_CODE = 710,
  QUERY_PLANNING_ERROR_CODE = 720,
  UNKNOWN_ERROR_CODE = 1000,
}

/**
 * Coarse, protocol-agnostic classification of a Pinot query error.
 *
 * Lets consumers (gRPC, REST, CLI, ...) map a Pinot error to their own status
 * vocabulary without hand-maintaining a copy of {@link ERROR_CODES}.
 *
 * @public
 */
export enum EPinotErrorCategory {
  VALIDATION,
  PERMISSION_DENIED,
  NOT_FOUND,
  TIMEOUT,
  RESOURCE_EXHAUSTED,
  CANCELLED,
  UNAVAILABLE,
  QUERY_ERROR,
}

const ERROR_CATEGORIES: Partial<Record<ERROR_CODES, EPinotErrorCategory>> = {
  // malformed/invalid query supplied by the caller
  [ERROR_CODES.JSON_PARSING_ERROR_CODE]: EPinotErrorCategory.VALIDATION,
  [ERROR_CODES.SQL_PARSING_ERROR_CODE]: EPinotErrorCategory.VALIDATION,
  [ERROR_CODES.TIMESERIES_PARSING_ERROR_CODE]: EPinotErrorCategory.VALIDATION,
  [ERROR_CODES.QUERY_VALIDATION_ERROR_CODE]: EPinotErrorCategory.VALIDATION,
  [ERROR_CODES.UNKNOWN_COLUMN_ERROR_CODE]: EPinotErrorCategory.VALIDATION,

  [ERROR_CODES.ACCESS_DENIED_ERROR_CODE]: EPinotErrorCategory.PERMISSION_DENIED,

  [ERROR_CODES.TABLE_DOES_NOT_EXIST_ERROR_CODE]: EPinotErrorCategory.NOT_FOUND,
  [ERROR_CODES.TABLE_IS_DISABLED_ERROR_CODE]: EPinotErrorCategory.NOT_FOUND,

  // query/broker/server ran out of time
  [ERROR_CODES.QUERY_SCHEDULING_TIMEOUT_ERROR_CODE]:
    EPinotErrorCategory.TIMEOUT,
  [ERROR_CODES.EXECUTION_TIMEOUT_ERROR_CODE]: EPinotErrorCategory.TIMEOUT,
  [ERROR_CODES.BROKER_TIMEOUT_ERROR_CODE]: EPinotErrorCategory.TIMEOUT,

  // cluster/server capacity or quota exceeded
  [ERROR_CODES.SERVER_OUT_OF_CAPACITY_ERROR_CODE]:
    EPinotErrorCategory.RESOURCE_EXHAUSTED,
  [ERROR_CODES.SERVER_RESOURCE_LIMIT_EXCEEDED_ERROR_CODE]:
    EPinotErrorCategory.RESOURCE_EXHAUSTED,
  [ERROR_CODES.QUERY_SCAN_LIMIT_EXCEEDED_ERROR_CODE]:
    EPinotErrorCategory.RESOURCE_EXHAUSTED,
  [ERROR_CODES.TOO_MANY_REQUESTS_ERROR_CODE]:
    EPinotErrorCategory.RESOURCE_EXHAUSTED,

  [ERROR_CODES.QUERY_CANCELLATION_ERROR_CODE]: EPinotErrorCategory.CANCELLED,

  // cluster infra (broker/server/segments) temporarily unreachable
  [ERROR_CODES.SERVER_SHUTTING_DOWN_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.SERVER_TABLE_MISSING_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.SERVER_SEGMENT_MISSING_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.BROKER_SEGMENT_UNAVAILABLE_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.BROKER_RESOURCE_MISSING_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.BROKER_INSTANCE_MISSING_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.BROKER_REQUEST_SEND_ERROR_CODE]: EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.SERVER_NOT_RESPONDING_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,
  [ERROR_CODES.REMOTE_CLUSTER_UNAVAILABLE_ERROR_CODE]:
    EPinotErrorCategory.UNAVAILABLE,

  // everything else is an opaque query/execution failure
  [ERROR_CODES.SQL_RUNTIME_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
  [ERROR_CODES.QUERY_EXECUTION_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
  [ERROR_CODES.INTERNAL_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
  [ERROR_CODES.MERGE_RESPONSE_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
  [ERROR_CODES.QUERY_PLANNING_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
  [ERROR_CODES.UNKNOWN_ERROR_CODE]: EPinotErrorCategory.QUERY_ERROR,
};

/**
 * Categorizes a Pinot query error code into a coarse, protocol-agnostic
 * bucket. Unmapped/unknown codes default to `QUERY_ERROR`.
 *
 * @public
 */
export function getErrorCategory(errorCode: number): EPinotErrorCategory {
  return (
    ERROR_CATEGORIES[errorCode as ERROR_CODES] ??
    EPinotErrorCategory.QUERY_ERROR
  );
}

export interface IPinotErrorConstructorArgs<TData = Record<string, unknown>> {
  message: string;
  type?: EPinotErrorType;
  code?: number;
  cause?: Error;
  exceptions?: IPinotSqlException[] | undefined;
  data?: TData;
}

/**
 * Apache Pinot exception
 */
export interface IPinotSqlException {
  /**
   * Error message
   */
  message: string;
  /**
   * Error code
   */
  errorCode: number;
}

export class PinotError<TData = Record<string, unknown>> extends Error {
  public readonly type: EPinotErrorType;
  public readonly code: number;
  // public override readonly cause?: Error;
  public readonly exceptions?: IPinotSqlException[] | undefined;
  public readonly data?: TData | undefined;
  constructor({
    message,
    type = EPinotErrorType.UNKNOWN,
    code = 0,
    cause,
    exceptions,
    data,
  }: IPinotErrorConstructorArgs<TData>) {
    super(message);
    this.name = 'PinotError';
    this.type = type;
    this.code =
      type * 1000 +
      (exceptions?.length === 1 && exceptions[0] && !code
        ? exceptions[0].errorCode
        : code);
    this.cause = cause;
    this.exceptions = exceptions;
    this.data = data;
  }

  /**
   * Coarse, protocol-agnostic category of this error. Pinot only guarantees a
   * reliable numeric code when there's exactly one exception, otherwise falls
   * back to this error's own `code`.
   */
  public get category(): EPinotErrorCategory {
    const [exception] = this.exceptions ?? [];
    const errorCode =
      this.exceptions?.length === 1 && exception
        ? exception.errorCode
        : PinotError.parseErrorCode(this.code).errorCode;
    return getErrorCategory(errorCode);
  }

  /**
   * Parses a PinotError code and returns the corresponding error type and code.
   */
  public static parseErrorCode(code: number): {
    type: EPinotErrorType;
    errorCode: ERROR_CODES;
  } {
    const type = Math.floor(code / 1000);
    const errorCode = code % 1000;
    return { type, errorCode };
  }
}
