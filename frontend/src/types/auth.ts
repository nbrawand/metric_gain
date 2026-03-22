/**
 * Authentication type definitions
 */

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
  experience_level: string;
  timezone: string;
  preferences: string;
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
