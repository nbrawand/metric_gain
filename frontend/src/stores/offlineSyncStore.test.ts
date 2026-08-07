/**
 * The queue behind the "works offline" claim.
 *
 * The rules that matter are all about not losing work: a failure the server
 * will never accept is dropped, anything else is kept, and another account
 * signing in on the same device must not touch the previous one's unsent sets.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/workoutSessions');
vi.mock('./authStore');

import { updateWorkoutSet } from '../api/workoutSessions';
import { useAuthStore } from './authStore';
import { useOfflineSyncStore } from './offlineSyncStore';

const asUser = (id: number | undefined) => {
  vi.mocked(useAuthStore).getState = vi.fn(
    () => ({ user: id === undefined ? undefined : { id } })
  ) as unknown as typeof useAuthStore.getState;
};

const reset = () => {
  useOfflineSyncStore.setState({ pendingItems: {}, syncInProgress: false });
};

describe('offlineSyncStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
    asUser(1);
  });

  it('queues a save and reports it as pending for that session', () => {
    useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });

    expect(useOfflineSyncStore.getState().hasPending()).toBe(true);
    expect([...useOfflineSyncStore.getState().getPendingSetIds(10)]).toEqual([100]);
    // A different session must not see it
    expect([...useOfflineSyncStore.getState().getPendingSetIds(11)]).toEqual([]);
  });

  it('keeps only the latest value for a set', () => {
    // Otherwise an older queued number drains later and overwrites the newer one
    const store = useOfflineSyncStore.getState();
    store.enqueue(10, 100, { weight: 225, reps: 5 });
    store.enqueue(10, 100, { weight: 235, reps: 5 });

    const pending = useOfflineSyncStore.getState().getPendingForSession(10);
    expect(pending).toHaveLength(1);
    expect(pending[0].data.weight).toBe(235);
  });

  it('drains successfully and clears the queue', async () => {
    vi.mocked(updateWorkoutSet).mockResolvedValue({} as never);
    useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });

    const { syncedSetIds } = await useOfflineSyncStore.getState().drainQueue('token');

    expect(syncedSetIds).toEqual([100]);
    expect(useOfflineSyncStore.getState().hasPending()).toBe(false);
  });

  it('stops draining the moment the connection is gone', async () => {
    // Nothing else will get through either, and hammering wastes the battery
    vi.mocked(updateWorkoutSet).mockRejectedValue({ status: 0, detail: '' });
    const store = useOfflineSyncStore.getState();
    store.enqueue(10, 100, { weight: 225, reps: 5 });
    store.enqueue(10, 101, { weight: 225, reps: 5 });

    await useOfflineSyncStore.getState().drainQueue('token');

    expect(vi.mocked(updateWorkoutSet)).toHaveBeenCalledTimes(1);
    expect(useOfflineSyncStore.getState().hasPending()).toBe(true);
  });

  it('keeps work the server might still accept later', async () => {
    // An expired token, a 500, a proxy error mid-deploy — none of these mean
    // the set is invalid, and dropping them loses the workout
    for (const status of [401, 500, 502]) {
      reset();
      vi.mocked(updateWorkoutSet).mockRejectedValue({ status, detail: '' });
      useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });

      await useOfflineSyncStore.getState().drainQueue('token');

      expect(useOfflineSyncStore.getState().hasPending()).toBe(true);
    }
  });

  it('drops only what the server can never accept', async () => {
    for (const status of [400, 404, 422]) {
      reset();
      vi.mocked(updateWorkoutSet).mockRejectedValue({ status, detail: '' });
      useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });

      await useOfflineSyncStore.getState().drainQueue('token');

      expect(useOfflineSyncStore.getState().hasPending()).toBe(false);
    }
  });

  it('does not flip an un-logged set back to logged when it syncs', async () => {
    // A queued clear must not resurrect the checkmark the user just removed
    vi.mocked(updateWorkoutSet).mockResolvedValue({} as never);
    useOfflineSyncStore.getState().enqueue(10, 100, { weight: 0, reps: 0 }, false);

    const { syncedSetIds } = await useOfflineSyncStore.getState().drainQueue('token');

    expect(syncedSetIds).toEqual([]);
    expect(useOfflineSyncStore.getState().hasPending()).toBe(false);
  });

  it('hides another account\'s queued sets', () => {
    // The queue outlives logout and lives on the shared device
    useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });
    asUser(2);

    expect(useOfflineSyncStore.getState().hasPending()).toBe(false);
    expect([...useOfflineSyncStore.getState().getPendingSetIds(10)]).toEqual([]);
  });

  it('shows everything while the user record is still loading', () => {
    /**
     * There is nobody to exclude yet. Hiding the queue here is what let
     * "Complete Workout" write zeros over sets that were only queued.
     */
    useOfflineSyncStore.getState().enqueue(10, 100, { weight: 225, reps: 5 });
    asUser(undefined);

    expect(useOfflineSyncStore.getState().hasPending()).toBe(true);
  });

  it('removes a queued value for one set without touching the others', () => {
    const store = useOfflineSyncStore.getState();
    store.enqueue(10, 100, { weight: 225, reps: 5 });
    store.enqueue(10, 101, { weight: 225, reps: 5 });

    useOfflineSyncStore.getState().removeForSet(10, 100);

    expect([...useOfflineSyncStore.getState().getPendingSetIds(10)]).toEqual([101]);
  });
});
