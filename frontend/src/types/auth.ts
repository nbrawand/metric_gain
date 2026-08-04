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
  subscription_status: string;
  trial_ends_at: string | null;
  is_admin: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
