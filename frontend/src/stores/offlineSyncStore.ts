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

      removeForSet: (sessionId, setId) => get().remove(`${sessionId}:${setId}`),

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
            const status = err?.status;
            // Only drop work the server can never accept. Anything else — no
            // connection, an expired token, a 500 or a proxy error mid-deploy —
            // must keep the sets queued, or the whole workout is lost.
            if (status === 400 || status === 404 || status === 422) {
              console.warn(`Offline sync: dropping rejected item ${key}`, err);
              get().remove(key);
              continue;
            }
            break;
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

      getPendingForSession: (sessionId) =>
        Object.values(get().pendingItems).filter((item) => item.sessionId === sessionId),

      hasPending: () => Object.keys(get().pendingItems).length > 0,
    }),
    {
      name: 'offline-sync-storage',
      partialize: (state) => ({ pendingItems: state.pendingItems }),
    }
  )
);
