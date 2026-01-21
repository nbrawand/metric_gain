/**
 * Authentication API client
 */

import { get, post } from './client';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  TokenRefreshRequest,
  TokenResponse,
  User,
} from '../types/auth';

const AUTH_BASE = '/v1/auth';

/**
 * Register a new user account
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return post<AuthResponse>(`${AUTH_BASE}/register`, data);
}

/**
 * Login with email and password
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return post<AuthResponse>(`${AUTH_BASE}/login`, data);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(
  refreshToken: string
): Promise<TokenResponse> {
  const data: TokenRefreshRequest = { refresh_token: refreshToken };
  return post<TokenResponse>(`${AUTH_BASE}/refresh`, data);
}

/**
 * Get current authenticated user's information
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  return get<User>(`${AUTH_BASE}/users/me`, accessToken);
}
