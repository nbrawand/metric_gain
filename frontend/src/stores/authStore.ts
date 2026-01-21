/**
 * Authentication state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/auth';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (data: RegisterRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register(data);

          set({
            user: response.user,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const apiError = err as ApiError;
          set({
            error: apiError.detail || 'Registration failed',
            isLoading: false,
          });
          throw err;
        }
      },

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(data);

          set({
            user: response.user,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const apiError = err as ApiError;
          set({
            error: apiError.detail || 'Login failed',
            isLoading: false,
          });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authApi.refreshToken(refreshToken);

          set({
            accessToken: response.access_token,
          });
        } catch (err) {
          // If refresh fails, log out the user
          get().logout();
          throw err;
        }
      },

      fetchCurrentUser: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          throw new Error('No access token available');
        }

        set({ isLoading: true, error: null });

        try {
          const user = await authApi.getCurrentUser(accessToken);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const apiError = err as ApiError;

          // If 401, try to refresh token
          if (apiError.status === 401) {
            try {
              await get().refreshAccessToken();
              // Retry fetching user with new token
              const user = await authApi.getCurrentUser(get().accessToken!);
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              // Refresh failed, logout
              get().logout();
              set({
                error: 'Session expired. Please login again.',
                isLoading: false,
              });
            }
          } else {
            set({
              error: apiError.detail || 'Failed to fetch user',
              isLoading: false,
            });
          }
          throw err;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
