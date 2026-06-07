/**
 * Normalized error every API call rejects with. The axios layer converts axios
 * errors / backend error envelopes / network failures into this single shape so
 * UI code has exactly one thing to handle.
 */
export class ApiError extends Error {
  /** Backend error code, e.g. 'INVALID_CREDENTIALS'. 'NETWORK'/'UNKNOWN' for transport failures. */
  readonly code: string;
  /** HTTP status (0 when the request never reached the server). */
  readonly status: number;
  /** Validation details etc. (backend `error.details`). */
  readonly details?: unknown;
  /** Request id from the response envelope, for support/correlation. */
  readonly requestId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
