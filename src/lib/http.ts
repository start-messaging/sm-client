import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import { endpoints } from '@/api/endpoints';
import { authStore, useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/error';
import type {
  ErrorEnvelope,
  RefreshResult,
  SuccessEnvelope,
} from '@/types/api';

/**
 * The single axios instance for the whole app. Responsibilities:
 *   1. Attach the access token.
 *   2. Unwrap the `{ data, meta }` success envelope so callers get the payload.
 *   3. On 401, transparently refresh the tokens ONCE and replay queued requests
 *      — single-flight, so concurrent 401s don't each fire a refresh (which
 *      would trip the backend's refresh-reuse/theft detection).
 *
 * Every rejection is normalized to `ApiError` (see types/error.ts).
 */

const REFRESH_PATH = endpoints.auth.refresh;

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // lets an httpOnly refresh cookie flow once the backend uses one
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

/* ----------------------- dev-only artificial latency ----------------------- */
// Optional: pause before every request so loading states are visible against a
 // fast localhost backend. Default OFF — inbox polling + forms feel laggy at 1s.
// Enable with VITE_DEV_API_DELAY_MS=400 (or similar) in sm-client/.env.
const DEV_API_DELAY_MS = (() => {
  const raw = import.meta.env.VITE_DEV_API_DELAY_MS as string | undefined;
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
})();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------- request: auth header --------------------------- */

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (env.isDev && DEV_API_DELAY_MS > 0) await sleep(DEV_API_DELAY_MS);
  const token = authStore.get().accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------------------- response: unwrap envelope ------------------------- */
// On 2xx, replace `response.data` (the envelope) with the inner payload so every
// caller — and every TanStack Query hook — receives the unwrapped value.
http.interceptors.response.use(
  (response) => {
    const body = response.data as SuccessEnvelope<unknown> | unknown;
    if (body && typeof body === 'object' && 'data' in body && 'meta' in body) {
      response.data = (body as SuccessEnvelope<unknown>).data;
    }
    return response;
  },
  (error: unknown) => handleResponseError(error),
);

/* ----------------------------- refresh plumbing ----------------------------- */

let refreshPromise: Promise<string> | null = null;

/** Perform a single refresh; concurrent callers share the same in-flight promise. */
function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const { refreshToken } = authStore.get();
  if (!refreshToken) {
    // Cache the rejection too, so concurrent 401s share one outcome (single
    // flight), consistent with the success path. Cleared next tick.
    refreshPromise = Promise.reject(
      new ApiError({ code: 'NO_SESSION', message: 'No session', status: 401 }),
    );
    void refreshPromise
      .catch(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  refreshPromise = axios
    // Bare axios (not `http`) so this call skips the interceptors and can't recurse.
    .post<SuccessEnvelope<RefreshResult>>(
      `${env.apiBaseUrl}${REFRESH_PATH}`,
      { refreshToken },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    .then((res) => {
      // The refresh token ROTATES — persist BOTH new tokens, not just access.
      const { accessToken, refreshToken: rotated } = res.data.data;
      useAuthStore.getState().setTokens({ accessToken, refreshToken: rotated });
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function handleResponseError(error: unknown): Promise<never> {
  if (!(error instanceof AxiosError)) {
    throw new ApiError({
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 0,
    });
  }

  const original = error.config as
    | (InternalAxiosRequestConfig & { _retried?: boolean })
    | undefined;
  const status = error.response?.status ?? 0;

  // No response at all → network/timeout.
  if (!error.response) {
    throw new ApiError({
      code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK',
      message: 'Could not reach the server. Check your connection.',
      status: 0,
    });
  }

  const isRefreshCall = original?.url?.includes(REFRESH_PATH);

  // 401 on a normal call → try a one-time silent refresh, then replay.
  if (status === 401 && original && !original._retried && !isRefreshCall) {
    original._retried = true;
    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return http(original) as Promise<never>;
    } catch {
      useAuthStore.getState().clear();
      throw toApiError(error.response.data, status);
    }
  }

  // Refresh endpoint itself failed → session is gone.
  if (status === 401 && isRefreshCall) {
    useAuthStore.getState().clear();
  }

  throw toApiError(error.response.data, status);
}

function toApiError(data: unknown, status: number): ApiError {
  const envelope = data as Partial<ErrorEnvelope> | undefined;
  if (envelope?.error?.code) {
    return new ApiError({
      code: envelope.error.code,
      message: envelope.error.message,
      status,
      details: envelope.error.details,
      requestId: envelope.meta?.requestId,
    });
  }
  return new ApiError({
    code: 'HTTP_ERROR',
    message: `Request failed (${status})`,
    status,
  });
}

/* ------------------------------ typed helpers ------------------------------ */
// Thin wrappers that return the unwrapped payload (T), not AxiosResponse.

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  return (await http.get<T>(url, config)).data;
}
export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  return (await http.post<T>(url, body, config)).data;
}
export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  return (await http.patch<T>(url, body, config)).data;
}
export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  return (await http.put<T>(url, body, config)).data;
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  return (await http.delete<T>(url, config)).data;
}
