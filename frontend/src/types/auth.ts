/**
 * Authentication type definitions
 */

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
  timezone: string;
  preferences: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
