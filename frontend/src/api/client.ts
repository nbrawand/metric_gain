/**
 * Base API client configuration and utilities
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status: number;
}

/**
 * Parse an error response into an ApiError
 */
function parseErrorResponse(response: Response, errorData?: unknown): ApiError {
  const error: ApiError = {
    detail: 'An error occurred',
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
 * Global connectivity state — tracks whether the backend is reachable.
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
 * Returns the new access token, or null if refresh failed.
 */
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (!stored) return null;
      const { state } = JSON.parse(stored);
      const refreshToken = state?.refreshToken;
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const newAccessToken: string = data.access_token;

      // Update Zustand in-memory state so components get the fresh token
      if (_setAccessToken) {
        _setAccessToken(newAccessToken);
      }

      return newAccessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
    // Network error — server unreachable
    setServerReachable(false);
    const error: ApiError = { detail: 'An error occurred', status: 0 };
    throw error;
  }

  // We got a response — server is reachable
  setServerReachable(true);

  if (!response.ok) {
    let errorData: unknown;
    try { errorData = await response.json(); } catch { /* non-JSON */ }

    // On 401, try refreshing the token once
    if (response.status === 401 && !_isRetry) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        return fetchApi<T>(endpoint, { ...options, headers: retryHeaders }, true);
      }
      // Refresh failed — session is truly expired, log out
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
export async function del<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    method: 'DELETE',
    headers,
  });
}
