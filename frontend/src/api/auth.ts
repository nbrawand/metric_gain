/**
 * Authentication API client
 */

import { get, post } from './client';
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
