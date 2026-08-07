/**
 * Authentication API client
 */

import { API_BASE_URL, get, post } from './client';
import type {
  AuthResponse,
  TokenResponse,
  User,
} from '../types/auth';

const AUTH_BASE = '/v1/auth';

/**
 * Get Google OAuth client ID from backend
 */
export async function getGoogleClientId(): Promise<{ client_id: string }> {
  return get<{ client_id: string }>(`${AUTH_BASE}/google-client-id`);
}

/**
 * Login with Google OAuth id_token
 */
export async function googleLogin(idToken: string): Promise<AuthResponse> {
  return post<AuthResponse>(`${AUTH_BASE}/google`, { id_token: idToken });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(
  refreshTokenStr: string
): Promise<TokenResponse> {
  return post<TokenResponse>(`${AUTH_BASE}/refresh`, { refresh_token: refreshTokenStr });
}

/**
 * Revoke every token issued to the signed-in user.
 *
 * Clearing local state alone left the tokens usable until they expired, so the
 * server has to be told. Best-effort: if the call fails we still sign out
 * locally rather than trapping someone in a session they asked to leave.
 *
 * Deliberately a raw fetch rather than the shared client: on a 401 the client
 * would try to refresh and, failing that, call logout again, and logout is
 * what called this.
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  await fetch(`${API_BASE_URL}${AUTH_BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    keepalive: true,
  });
}

/**
 * Get current authenticated user's information
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  return get<User>(`${AUTH_BASE}/users/me`, accessToken);
}

/**
 * Update current authenticated user's profile
 */
export async function updateCurrentUser(
  data: Partial<Pick<User, 'full_name' | 'timezone' | 'preferences'>>,
  accessToken: string
): Promise<User> {
  const { patch } = await import('./client');
  return patch<User>(`${AUTH_BASE}/users/me`, data, accessToken);
}
