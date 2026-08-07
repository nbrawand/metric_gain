/**
 * Authentication state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/auth';
import type { User } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updatePreferences: (prefs: Record<string, unknown>) => Promise<void>;
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

      googleLogin: async (idToken: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.googleLogin(idToken);

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
            error: apiError.detail || 'Google sign-in failed. Please try again.',
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
                error: 'Your session has expired. Please sign in again.',
                isLoading: false,
              });
            }
          } else {
            set({
              error: apiError.detail || 'Could not load your account. Please try again.',
              isLoading: false,
            });
          }
          throw err;
        }
      },

      updatePreferences: async (prefs: Record<string, unknown>) => {
        const { accessToken, user } = get();
        if (!accessToken || !user) return;

        const existing = user.preferences ? JSON.parse(user.preferences) : {};
        const merged = { ...existing, ...prefs };
        const preferencesStr = JSON.stringify(merged);

        const updated = await authApi.updateCurrentUser(
          { preferences: preferencesStr },
          accessToken
        );
        set({ user: updated });
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
