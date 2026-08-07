import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/workoutSessions');
vi.mock('../api/exercises');
vi.mock('../api/mesocycles');
vi.mock('../stores/authStore');
vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: '1' }),
  useNavigate: () => vi.fn(),
}));

import * as sessionsApi from '../api/workoutSessions';
import * as exercisesApi from '../api/exercises';
import * as mesocyclesApi from '../api/mesocycles';
import { useAuthStore } from '../stores/authStore';
import { useOfflineSyncStore } from '../stores/offlineSyncStore';
import WorkoutExecution from './WorkoutExecution';

const exercise = { id: 7, name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' };

/** One exercise, one set, already logged at 100 x 8. */
const session = (over = {}) => ({
  id: 1,
  user_id: 1,
  mesocycle_instance_id: 1,
  workout_template_id: 1,
  workout_date: '2026-08-07',
  week_number: 1,
  day_number: 1,
  status: 'in_progress',
  duration_minutes: null,
  notes: null,
  created_at: '2026-08-07T00:00:00',
  updated_at: '2026-08-07T00:00:00',
  completed_at: null,
  workout_sets: [
    {
      id: 50,
      workout_session_id: 1,
      exercise_id: 7,
      exercise,
      set_number: 1,
      order_index: 0,
      weight: 100,
      reps: 8,
      rir: null,
      target_weight: 100,
      target_reps: 8,
      target_rir: 2,
      skipped: 0,
      notes: null,
      created_at: '2026-08-07T00:00:00',
      updated_at: '2026-08-07T00:00:00',
    },
  ],
  ...over,
});

const instance = {
  id: 1,
  user_id: 1,
  mesocycle_template_id: 1,
  name: 'Test Block',
  weeks: 4,
  total_weeks: 5,
  days_per_week: 1,
  start_date: '2026-08-03',
  status: 'active',
  includes_deload: true,
  autoregulate_volume: true,
  current_week: 1,
  created_at: '2026-08-07T00:00:00',
  updated_at: '2026-08-07T00:00:00',
  template_weeks: 4,
  template_days_per_week: 1,
  // The page renders the error state without this: it reads the plan through
  // the instance's nested template, not from the instance alone
  mesocycle_template: {
    id: 1,
    name: 'Test Block',
    weeks: 4,
    days_per_week: 1,
    workout_templates: [
      {
        id: 1,
        name: 'Day 1',
        order_index: 0,
        exercises: [
          {
            id: 1,
            exercise_id: 7,
            exercise,
            order_index: 0,
            target_sets: 1,
            weekly_set_increment: 0,
            target_reps_min: 8,
            target_reps_max: 10,
            starting_rir: 3,
            ending_rir: 0,
          },
        ],
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useOfflineSyncStore.setState({ pendingItems: {} });
  vi.mocked(useAuthStore).mockReturnValue({
    accessToken: 'token',
    user: { preferences: '{}' },
  } as unknown as ReturnType<typeof useAuthStore>);
  // The offline store tags each queued set with its owner by calling
  // useAuthStore.getState(). Auto-mocking the module leaves that returning
  // undefined, so enqueue throws and the queue silently stays empty.
  (useAuthStore as unknown as { getState: () => unknown }).getState = () => ({
    user: { id: 1, preferences: '{}' },
  });
  vi.mocked(sessionsApi.getWorkoutSession).mockResolvedValue(session() as never);
  vi.mocked(sessionsApi.listWorkoutSessions).mockResolvedValue([] as never);
  vi.mocked(sessionsApi.updateWorkoutSet).mockResolvedValue({} as never);
  vi.mocked(mesocyclesApi.getMesocycleInstance).mockResolvedValue(instance as never);
  vi.mocked(exercisesApi.getExercises).mockResolvedValue([exercise] as never);
});

const weightInput = () => screen.getByDisplayValue('100') as HTMLInputElement;
const repsInput = () => screen.getByDisplayValue('8') as HTMLInputElement;

describe('WorkoutExecution set logging', () => {
  it('shows the set as it was logged', async () => {
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    expect(weightInput()).toBeInTheDocument();
    expect(repsInput()).toBeInTheDocument();
  });

  it('keeps the weight when only the reps are edited', async () => {
    // The weight input still shows 100 the whole time, so whatever is sent
    // has to be 100. Anything else silently destroys a logged lift.
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(repsInput(), { target: { value: '9' } });

    // Editing clears the check, which is what puts the save button back
    const save = await screen.findByTitle('Save this set');
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();

    fireEvent.click(save);

    await waitFor(() => expect(sessionsApi.updateWorkoutSet).toHaveBeenCalled());
    const [, , payload] = vi.mocked(sessionsApi.updateWorkoutSet).mock.calls[0];
    expect(payload).toMatchObject({ weight: 100, reps: 9 });
    expect(payload.skipped).toBe(0);
  });

  it('keeps the reps when only the weight is edited', async () => {
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '105' } });
    fireEvent.click(await screen.findByTitle('Save this set'));

    await waitFor(() => expect(sessionsApi.updateWorkoutSet).toHaveBeenCalled());
    const [, , payload] = vi.mocked(sessionsApi.updateWorkoutSet).mock.calls[0];
    expect(payload).toMatchObject({ weight: 105, reps: 8 });
  });

  it('refuses letters in a number field', async () => {
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '10a' } });
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('marks an untouched empty set as skipped rather than a 0 lb lift', async () => {
    vi.mocked(sessionsApi.getWorkoutSession).mockResolvedValue(
      session({
        workout_sets: [
          { ...session().workout_sets[0], id: 51, weight: 0, reps: 0, target_weight: 0 },
        ],
      }) as never
    );
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.click(await screen.findByTitle('Save this set'));

    await waitFor(() => expect(sessionsApi.updateWorkoutSet).toHaveBeenCalled());
    const [, , payload] = vi.mocked(sessionsApi.updateWorkoutSet).mock.calls[0];
    expect(payload).toMatchObject({ weight: 0, reps: 0, skipped: 1 });
  });
});

describe('WorkoutExecution when the network is gone', () => {
  const offline = () => {
    const err = { detail: 'offline', status: 0 };
    vi.mocked(sessionsApi.updateWorkoutSet).mockRejectedValue(err);
  };

  it('keeps the set rather than losing what was lifted', async () => {
    // The lift happened. Failing the save must not discard it, and must not
    // leave the set looking unlogged, or it gets repeated.
    offline();
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '105' } });
    fireEvent.click(await screen.findByTitle('Save this set'));

    await waitFor(() =>
      expect(useOfflineSyncStore.getState().getPendingForSession(1)).toHaveLength(1)
    );
    const [queued] = useOfflineSyncStore.getState().getPendingForSession(1);
    expect(queued.setId).toBe(50);
    expect(queued.data).toMatchObject({ weight: 105, reps: 8 });
  });

  it('shows a queued set as saved, not as still to do', async () => {
    offline();
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '105' } });
    fireEvent.click(await screen.findByTitle('Save this set'));

    expect(await screen.findByTitle(/Saved locally/i)).toBeInTheDocument();
  });

  it('does not blame the user for being offline', async () => {
    offline();
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '105' } });
    fireEvent.click(await screen.findByTitle('Save this set'));

    await waitFor(() =>
      expect(useOfflineSyncStore.getState().getPendingForSession(1)).toHaveLength(1)
    );
    expect(screen.queryByText(/Could not save that set/i)).not.toBeInTheDocument();
  });

  it('replaces a queued value instead of stacking a second one', async () => {
    // Two queued writes for the same set would drain in order and the older
    // one could land last, overwriting the newer number
    offline();
    render(<WorkoutExecution />);
    await waitFor(() => expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument());

    fireEvent.change(weightInput(), { target: { value: '105' } });
    fireEvent.click(await screen.findByTitle('Save this set'));
    await waitFor(() =>
      expect(useOfflineSyncStore.getState().getPendingForSession(1)).toHaveLength(1)
    );

    fireEvent.change(screen.getByDisplayValue('105'), { target: { value: '110' } });
    fireEvent.click(await screen.findByTitle('Save this set'));

    await waitFor(() => {
      const pending = useOfflineSyncStore.getState().getPendingForSession(1);
      expect(pending).toHaveLength(1);
      expect(pending[0].data).toMatchObject({ weight: 110 });
    });
  });
});
