export enum EPinotErrorType {
  UNKNOWN,
  TRANSPORT,
  SQL,
  PARSE,
}

export enum ERROR_CODES {
  JSON_PARSING_ERROR_CODE = 100,
  JSON_COMPILATION_ERROR_CODE = 101,
  SQL_PARSING_ERROR_CODE = 150,
  SEGMENT_PLAN_EXECUTION_ERROR_CODE = 160,
  COMBINE_SEGMENT_PLAN_TIMEOUT_ERROR_CODE = 170,
  ACCESS_DENIED_ERROR_CODE = 180,
  TABLE_DOES_NOT_EXIST_ERROR_CODE = 190,
  QUERY_EXECUTION_ERROR_CODE = 200,
  QUERY_CANCELLATION_ERROR_CODE = 205,
  SERVER_SHUTTING_DOWN_ERROR_CODE = 210,
  SERVER_OUT_OF_CAPACITY_ERROR_CODE = 211,
  SERVER_TABLE_MISSING_ERROR_CODE = 230,
  SERVER_SEGMENT_MISSING_ERROR_CODE = 235,
  QUERY_SCHEDULING_TIMEOUT_ERROR_CODE = 240,
  EXECUTION_TIMEOUT_ERROR_CODE = 250,
  DATA_TABLE_SERIALIZATION_ERROR_CODE = 260,
  BROKER_GATHER_ERROR_CODE = 300,
  BROKER_SEGMENT_UNAVAILABLE_ERROR_CODE = 305,
  DATA_TABLE_DESERIALIZATION_ERROR_CODE = 310,
  FUTURE_CALL_ERROR_CODE = 350,
  BROKER_TIMEOUT_ERROR_CODE = 400,
  BROKER_RESOURCE_MISSING_ERROR_CODE = 410,
  BROKER_INSTANCE_MISSING_ERROR_CODE = 420,
  BROKER_REQUEST_SEND_ERROR_CODE = 425,
  SERVER_NOT_RESPONDING_ERROR_CODE = 427,
  TOO_MANY_REQUESTS_ERROR_CODE = 429,
  INTERNAL_ERROR_CODE = 450,
  MERGE_RESPONSE_ERROR_CODE = 500,
  FEDERATED_BROKER_UNAVAILABLE_ERROR_CODE = 550,
  COMBINE_GROUP_BY_EXCEPTION_ERROR_CODE = 600,
  QUERY_VALIDATION_ERROR_CODE = 700,
  UNKNOWN_COLUMN_ERROR_CODE = 710,
  UNKNOWN_ERROR_CODE = 1000,
}

export interface IPinotErrorConstructorArgs<TData = Record<string, unknown>> {
  message: string;
  type?: EPinotErrorType;
  code?: number;
  cause?: Error;
  exceptions?: IPinotSqlException[] | undefined;
  data?: TData;
}

export interface IPinotSqlException {
  message: string;
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
      (exceptions?.length === 1 && !code ? exceptions[0]!.errorCode : code);
    this.cause = cause;
    this.exceptions = exceptions;
    this.data = data;
  }
}
