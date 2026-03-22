/**
 * Offline sync queue for workout set saves.
 * Queues failed saves to localStorage and drains when connectivity returns.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateWorkoutSet } from '../api/workoutSessions';
import type { WorkoutSetUpdate } from '../types/workout_session';

interface PendingSetSave {
  sessionId: number;
  setId: number;
  data: WorkoutSetUpdate;
  queuedAt: number;
}

interface OfflineSyncState {
  pendingItems: Record<string, PendingSetSave>;
  syncInProgress: boolean;

  enqueue: (sessionId: number, setId: number, data: WorkoutSetUpdate) => void;
  remove: (key: string) => void;
  drainQueue: (accessToken: string) => Promise<{ syncedSetIds: number[] }>;
  getPendingSetIds: (sessionId: number) => Set<number>;
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
            [key]: { sessionId, setId, data, queuedAt: Date.now() },
          },
        }));
      },

      remove: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.pendingItems;
          return { pendingItems: rest };
        });
      },

      drainQueue: async (accessToken) => {
        const state = get();
        if (state.syncInProgress) return { syncedSetIds: [] };

        const entries = Object.entries(state.pendingItems);
        if (entries.length === 0) return { syncedSetIds: [] };

        set({ syncInProgress: true });
        const syncedSetIds: number[] = [];

        for (const [key, item] of entries) {
          try {
            await updateWorkoutSet(item.sessionId, item.setId, item.data, accessToken);
            get().remove(key);
            syncedSetIds.push(item.setId);
          } catch (err: any) {
            if (err?.status === 0) {
              // Still offline — stop draining, leave remaining items
              break;
            }
            // Server error (404, 422, etc.) — remove stale item
            console.warn(`Offline sync: removing stale item ${key}`, err);
            get().remove(key);
          }
        }

        set({ syncInProgress: false });
        return { syncedSetIds };
      },

      getPendingSetIds: (sessionId) => {
        const items = get().pendingItems;
        const ids = new Set<number>();
        for (const item of Object.values(items)) {
          if (item.sessionId === sessionId) {
            ids.add(item.setId);
          }
        }
        return ids;
      },

      hasPending: () => Object.keys(get().pendingItems).length > 0,
    }),
    {
      name: 'offline-sync-storage',
      partialize: (state) => ({ pendingItems: state.pendingItems }),
    }
  )
);
