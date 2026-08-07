/**
 * Offline sync queue for workout set saves.
 * Queues failed saves to localStorage and drains when connectivity returns.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateWorkoutSet } from '../api/workoutSessions';
import { useAuthStore } from './authStore';
import type { WorkoutSetUpdate } from '../types/workout_session';

interface PendingSetSave {
  sessionId: number;
  setId: number;
  data: WorkoutSetUpdate;
  queuedAt: number;
  attempts?: number;
  userId?: number;
}

// The queue is retried on every drain, so this is generous — it exists only so
// an item the server will never accept cannot be retried forever.
const MAX_SYNC_ATTEMPTS = 25;

// The queue outlives logout, so entries are tagged with their owner: another
// account signing in on the same device must not sync — or discard — the
// previous one's unsent sets. Entries with no owner predate this and are
// treated as the current user's so nothing already queued is stranded.
// When the user record hasn't loaded yet there is nobody to exclude, so every
// entry counts as the current user's. Comparing against undefined instead hid
// the whole queue, which let "Complete Workout" write zeros over queued sets.
const currentUserId = () => useAuthStore.getState().user?.id;
const belongsToCurrentUser = (item: PendingSetSave) => {
  const userId = currentUserId();
  return userId === undefined || item.userId === undefined || item.userId === userId;
};

interface OfflineSyncState {
  pendingItems: Record<string, PendingSetSave>;
  syncInProgress: boolean;

  enqueue: (sessionId: number, setId: number, data: WorkoutSetUpdate) => void;
  remove: (key: string) => void;
  removeForSet: (sessionId: number, setId: number) => void;
  drainQueue: (accessToken: string) => Promise<{ syncedSetIds: number[] }>;
  getPendingSetIds: (sessionId: number) => Set<number>;
  getPendingForSession: (sessionId: number) => PendingSetSave[];
  hasPending: () => boolean;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      pendingItems: {},
      syncInProgress: false,

      enqueue: (sessionId, setId, data) => {
        const key = `${sessionId}:${setId}`;
        set((state) => ({
          pendingItems: {
            ...state.pendingItems,
            [key]: { sessionId, setId, data, queuedAt: Date.now(), userId: currentUserId() },
          },
        }));
      },

      remove: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.pendingItems;
          return { pendingItems: rest };
        });
      },

      removeForSet: (sessionId, setId) => get().remove(`${sessionId}:${setId}`),

      drainQueue: async (accessToken) => {
        const state = get();
        if (state.syncInProgress) return { syncedSetIds: [] };

        const entries = Object.entries(state.pendingItems).filter(([, item]) => belongsToCurrentUser(item));
        if (entries.length === 0) return { syncedSetIds: [] };

        set({ syncInProgress: true });
        const syncedSetIds: number[] = [];

        for (const [key, item] of entries) {
          try {
            await updateWorkoutSet(item.sessionId, item.setId, item.data, accessToken);
            get().remove(key);
            syncedSetIds.push(item.setId);
          } catch (err: any) {
            const status = err?.status;

            // No connection: nothing else will get through either
            if (status === 0) break;

            // Only drop work the server can never accept. Anything else — an
            // expired token, a 500, a proxy error mid-deploy — keeps the sets
            // queued, or the whole workout is lost.
            if (status === 400 || status === 404 || status === 422) {
              console.warn(`Offline sync: dropping rejected item ${key}`, err);
              get().remove(key);
              continue;
            }

            // Keep going rather than stopping at the first failure: one item
            // the server keeps refusing must not block everything queued
            // behind it. Give up on it only after many attempts.
            const attempts = (item.attempts || 0) + 1;
            if (attempts >= MAX_SYNC_ATTEMPTS) {
              console.warn(`Offline sync: giving up on ${key} after ${attempts} attempts`, err);
              get().remove(key);
            } else {
              set((state) => ({
                pendingItems: state.pendingItems[key]
                  ? { ...state.pendingItems, [key]: { ...state.pendingItems[key], attempts } }
                  : state.pendingItems,
              }));
            }
          }
        }

        set({ syncInProgress: false });
        return { syncedSetIds };
      },

      getPendingSetIds: (sessionId) => {
        const items = get().pendingItems;
        const ids = new Set<number>();
        for (const item of Object.values(items)) {
          if (item.sessionId === sessionId && belongsToCurrentUser(item)) {
            ids.add(item.setId);
          }
        }
        return ids;
      },

      getPendingForSession: (sessionId) =>
        Object.values(get().pendingItems).filter(
          (item) => item.sessionId === sessionId && belongsToCurrentUser(item)
        ),

      hasPending: () => Object.values(get().pendingItems).some(belongsToCurrentUser),
    }),
    {
      name: 'offline-sync-storage',
      partialize: (state) => ({ pendingItems: state.pendingItems }),
    }
  )
);
