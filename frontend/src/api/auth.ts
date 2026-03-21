/**
 * Authentication API client
 */

import { get, patch, post } from './client';
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

/**
 * Update current authenticated user's profile
 */
export async function updateCurrentUser(
  data: Partial<Pick<User, 'full_name' | 'timezone' | 'preferences' | 'experience_level'>>,
  accessToken: string
): Promise<User> {
  return patch<User>(`${AUTH_BASE}/users/me`, data, accessToken);
}

export interface MuscleParamEntry {
  muscle_group: string;
  params: {
    k1: number;
    k3: number;
    kappa0: number;
    tau1: number;
    tau2: number;
    tau3: number;
    tau_alpha: number;
    alpha0: number;
  };
  volume_profile: number[];
  updated_at: string | null;
}

/**
 * Get all per-muscle-group optimizer parameters for current user
 */
export async function getMuscleParams(
  accessToken: string
): Promise<MuscleParamEntry[]> {
  return get<MuscleParamEntry[]>(`${AUTH_BASE}/users/me/muscle-params`, accessToken);
}

/**
 * Reset a single muscle group's parameters to defaults for a given experience level
 */
export async function resetSingleMuscleParams(
  muscleGroup: string,
  experienceLevel: string,
  accessToken: string
): Promise<{ muscle_group: string; experience_level: string; params: Record<string, number> }> {
  return post(`${AUTH_BASE}/users/me/muscle-params/${encodeURIComponent(muscleGroup)}/reset`, { experience_level: experienceLevel }, accessToken);
}
