/**
 * Base API client configuration and utilities
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status: number;
}

// Shown whenever the request never reached the server. Call sites fall back to
// their own wording when `detail` is empty, so this is the one place that gets
// to describe a network failure.
const OFFLINE_DETAIL = "You appear to be offline. Check your connection and try again.";

/**
 * Narrow an unknown caught value to the shape fetchApi throws.
 *
 * Everything here rejects with an ApiError, but a catch block still receives
 * `unknown`, these keep call sites from having to cast to `any` to read it.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as ApiError).status === 'number'
  );
}

/** The server's message for an error, or a fallback worth showing a user. */
export function apiErrorDetail(error: unknown, fallback: string): string {
  if (isApiError(error) && typeof error.detail === 'string' && error.detail) {
    return error.detail;
  }
  return fallback;
}

/**
 * True when the request never reached the server.
 *
 * fetchApi uses status 0 for this, which is what the offline queue keys on.
 * A real HTTP failure must not be queued and retried forever.
 */
export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.status === 0;
}

/**
 * Parse an error response into an ApiError
 */
function parseErrorResponse(response: Response, errorData?: unknown): ApiError {
  const error: ApiError = {
    detail: '',
    status: response.status,
  };

  if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
    const data = errorData as { detail: unknown };
    if (Array.isArray(data.detail)) {
      error.detail = data.detail
        .map((e: { loc?: string[]; msg?: string }) => {
          const field = e.loc?.[e.loc.length - 1];
          return field ? `${field}: ${e.msg}` : e.msg;
        })
        .join('. ');
    } else if (typeof data.detail === 'string') {
      error.detail = data.detail;
    }
  }

  return error;
}

/**
 * Global connectivity state, tracks whether the backend is reachable.
 * Components subscribe via onConnectivityChange().
 */
let _serverReachable = true;
type ConnectivityListener = (reachable: boolean) => void;
const _connectivityListeners = new Set<ConnectivityListener>();

export function onConnectivityChange(listener: ConnectivityListener): () => void {
  _connectivityListeners.add(listener);
  return () => { _connectivityListeners.delete(listener); };
}

export function getServerReachable(): boolean {
  return _serverReachable;
}

function setServerReachable(reachable: boolean) {
  if (reachable === _serverReachable) return;
  _serverReachable = reachable;
  _connectivityListeners.forEach((fn) => fn(reachable));
}

/**
 * Hook for the auth store's setState, registered at app startup via setAuthStoreRef().
 * Allows the client to update the in-memory Zustand state after a token refresh.
 */
type AuthStoreSetter = (token: string) => void;
type AuthStoreLogout = () => void;
let _setAccessToken: AuthStoreSetter | null = null;
let _logout: AuthStoreLogout | null = null;

export function setAuthStoreRef(setToken: AuthStoreSetter, logout: AuthStoreLogout) {
  _setAccessToken = setToken;
  _logout = logout;
}

/**
 * Try to refresh the access token using the stored refresh token.
 * Updates both localStorage and Zustand in-memory state.
 *
 * Returns the new access token, or null when the session is genuinely over
 * (no stored token, or the server rejected it). Throws RefreshUnavailableError
 * when the server could not be reached, the refresh token is probably still
 * good, and treating that as an expiry signed people out mid-workout on a
 * flaky connection.
 */
class RefreshUnavailableError extends Error {}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  const run = async (): Promise<string | null> => {
    let refreshToken: string | undefined;
    try {
      const stored = localStorage.getItem('auth-storage');
      if (!stored) return null;
      refreshToken = JSON.parse(stored)?.state?.refreshToken;
    } catch {
      // Unreadable storage is indistinguishable from having no session
      return null;
    }
    if (!refreshToken) return null;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      throw new RefreshUnavailableError();
    }

    if (!response.ok) return null;

    // A 200 that isn't the token payload means something in front of the API
    // answered. Treat it as unreachable rather than as a dead session, and
    // never let the parse error escape as a non-ApiError.
    let newAccessToken: string | undefined;
    try {
      newAccessToken = (await response.json())?.access_token;
    } catch {
      throw new RefreshUnavailableError();
    }
    if (!newAccessToken) throw new RefreshUnavailableError();

    // Update Zustand in-memory state so components get the fresh token
    if (_setAccessToken) {
      _setAccessToken(newAccessToken);
    }

    return newAccessToken;
  };

  const attempt = run();
  refreshPromise = attempt;
  // Cleared after the assignment: resetting inside the body would run before
  // the assignment for a rejection thrown before the first await, caching a
  // rejected promise for the life of the tab.
  void attempt.catch(() => undefined).then(() => {
    refreshPromise = null;
  });

  return attempt;
}

/**
 * Base fetch wrapper with error handling and automatic token refresh
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    // Network error, server unreachable
    setServerReachable(false);
    const error: ApiError = { detail: OFFLINE_DETAIL, status: 0 };
    throw error;
  }

  // We got a response, server is reachable
  setServerReachable(true);

  if (!response.ok) {
    let errorData: unknown;
    try { errorData = await response.json(); } catch { /* non-JSON */ }

    // On 401, try refreshing the token once
    if (response.status === 401 && !_isRetry) {
      let newToken: string | null = null;
      try {
        newToken = await tryRefreshToken();
      } catch {
        // Could not reach the server to refresh, keep the session and let the
        // caller handle it as any other transient failure. Callers branch on
        // `status`, so nothing but an ApiError may leave here.
        setServerReachable(false);
        const error: ApiError = { detail: OFFLINE_DETAIL, status: 0 };
        throw error;
      }
      if (newToken) {
        // Build retry headers as a plain object so the spread on line 137 works
        const existingHeaders: Record<string, string> = {};
        if (options.headers instanceof Headers) {
          options.headers.forEach((v, k) => { existingHeaders[k] = v; });
        } else if (options.headers) {
          Object.assign(existingHeaders, options.headers);
        }
        existingHeaders['Authorization'] = `Bearer ${newToken}`;
        return fetchApi<T>(endpoint, { ...options, headers: existingHeaders }, true);
      }
      // Refresh failed, session is truly expired, log out
      if (_logout) _logout();
    }

    throw parseErrorResponse(response, errorData);
  }

  // Handle 204 No Content responses (e.g., from DELETE)
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

/**
 * GET request
 */
export async function get<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    method: 'GET',
    headers,
  });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  data?: unknown,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    method: 'POST',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  data?: unknown,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    method: 'PUT',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: unknown,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string, token?: string, data?: unknown): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // A body on DELETE is unusual but legal, and account deletion needs one to
  // carry the typed confirmation
  return fetchApi<T>(endpoint, {
    method: 'DELETE',
    headers,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
