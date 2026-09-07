/**
 * Base error class for all AWSYS.CO SDK errors.
 */
export class AwsysError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** API error code from the response body */
  readonly code: string;
  /** Raw response body */
  readonly raw: unknown;

  constructor(message: string, status: number, code: string, raw: unknown) {
    super(message);
    this.name = "AwsysError";
    this.status = status;
    this.code = code;
    this.raw = raw;
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the API key is missing or invalid (HTTP 401).
 */
export class AwsysAuthError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 401, code, raw);
    this.name = "AwsysAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when access to a resource is forbidden (HTTP 403).
 */
export class AwsysForbiddenError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 403, code, raw);
    this.name = "AwsysForbiddenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested resource does not exist (HTTP 404).
 */
export class AwsysNotFoundError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 404, code, raw);
    this.name = "AwsysNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a resource conflict occurs, e.g. slug already taken (HTTP 409).
 */
export class AwsysConflictError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 409, code, raw);
    this.name = "AwsysConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the request is rate limited (HTTP 429).
 */
export class AwsysRateLimitError extends AwsysError {
  /** Seconds to wait before retrying, if provided by the server */
  readonly retryAfter?: number;
  /** ISO timestamp (or provider-specific string) when a quota resets, if provided */
  readonly resetsAt?: string;

  constructor(
    message: string,
    code: string,
    raw: unknown,
    retryAfter?: number,
    resetsAt?: string,
  ) {
    super(message, 429, code, raw);
    this.name = "AwsysRateLimitError";
    this.retryAfter = retryAfter;
    this.resetsAt = resetsAt;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the request payload is invalid (HTTP 400).
 */
export class AwsysValidationError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 400, code, raw);
    this.name = "AwsysValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown for any unmapped HTTP 5xx server error.
 */
export class AwsysServerError extends AwsysError {
  constructor(message: string, status: number, code: string, raw: unknown) {
    super(message, status, code, raw);
    this.name = "AwsysServerError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown on transport-level failures (connection refused, DNS failure, etc.)
 * where no HTTP response was received.
 */
export class AwsysNetworkError extends AwsysError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, 0, code, raw);
    this.name = "AwsysNetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request is aborted after exceeding its timeout.
 */
export class AwsysTimeoutError extends AwsysNetworkError {
  constructor(message: string, code: string, raw: unknown) {
    super(message, code, raw);
    this.name = "AwsysTimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown for invalid client configuration (missing API key, malformed base
 * URL, etc.) before any network call is made.
 */
export class AwsysConfigurationError extends AwsysError {
  constructor(message: string, code: string = "CONFIGURATION_ERROR") {
    super(message, 0, code, undefined);
    this.name = "AwsysConfigurationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
