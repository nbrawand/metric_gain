import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/analytics');
vi.mock('../stores/authStore');

import * as analytics from '../api/analytics';
import { useAuthStore } from '../stores/authStore';
import Progress from './Progress';

const mockAuth = (preferences = '{}') => {
  vi.mocked(useAuthStore).mockReturnValue({
    accessToken: 'test-token',
    user: { preferences },
  } as unknown as ReturnType<typeof useAuthStore>);
};

const overview = (over: Partial<analytics.TrainingOverview> = {}) => ({
  sessions_completed: 9,
  sets_logged: 195,
  blocks_completed: 1,
  total_reps: 1560,
  total_volume: 414310,
  training_since: '2026-08-03',
  weight_unit: 'lb',
  ...over,
});

const volume = (over: Partial<analytics.VolumeHistory> = {}) => ({
  weeks: ['2026-08-03', '2026-08-10'],
  muscle_groups: ['Chest'],
  sets: { Chest: [8, 24] },
  ...over,
});

const strength = (over: Partial<analytics.StrengthHistory> = {}) => ({
  exercise_id: 1,
  exercise_name: 'Barbell Bench Press',
  muscle_group: 'Chest',
  weight_unit: 'lb',
  points: [
    { date: '2026-08-03', estimated_1rm: 260, weight: 225, reps: 5, rir: 2 },
    { date: '2026-08-10', estimated_1rm: 275, weight: 235, reps: 5, rir: 2 },
  ],
  ...over,
});

const records = () => ({
  weight_unit: 'lb',
  records: [
    {
      exercise_id: 1,
      exercise_name: 'Barbell Bench Press',
      muscle_group: 'Chest',
      best_estimated_1rm: 275,
      best_estimated_1rm_date: '2026-08-10',
      heaviest_weight: 235,
      heaviest_weight_reps: 5,
      heaviest_weight_date: '2026-08-10',
    },
  ],
});

const stubAll = () => {
  vi.mocked(analytics.getOverview).mockResolvedValue(overview());
  vi.mocked(analytics.getVolumeHistory).mockResolvedValue(volume());
  vi.mocked(analytics.getPersonalRecords).mockResolvedValue(records());
  vi.mocked(analytics.getTrainedExercises).mockResolvedValue([
    { id: 1, name: 'Barbell Bench Press', muscle_group: 'Chest' },
  ]);
  vi.mocked(analytics.getStrengthHistory).mockResolvedValue(strength());
};

describe('Progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    stubAll();
  });

  it('shows the headline totals once loaded', async () => {
    render(<Progress />);

    expect(await screen.findByText('195')).toBeInTheDocument();
    expect(screen.getByText('Sets logged')).toBeInTheDocument();
    // Formatted with separators; the raw number would be unreadable
    expect(screen.getByText('414,310')).toBeInTheDocument();
  });

  it('invites the user to train rather than showing empty charts', async () => {
    vi.mocked(analytics.getOverview).mockResolvedValue(
      overview({ sets_logged: 0, sessions_completed: 0, total_volume: 0, training_since: null })
    );
    render(<Progress />);

    expect(await screen.findByText(/nothing to show yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Best Lifts')).not.toBeInTheDocument();
  });

  it('reports the latest estimate and the change since the first session', async () => {
    render(<Progress />);

    expect(await screen.findByText('275 lbs')).toBeInTheDocument();
    expect(screen.getByText(/\+15 lbs since/)).toBeInTheDocument();
  });

  it('does not claim a trend from a single session', async () => {
    vi.mocked(analytics.getStrengthHistory).mockResolvedValue(
      strength({ points: [{ date: '2026-08-03', estimated_1rm: 260, weight: 225, reps: 5, rir: 2 }] })
    );
    render(<Progress />);

    expect(await screen.findByText(/one more session and this becomes a trend/i)).toBeInTheDocument();
  });

  it('flags a muscle group over its recoverable weekly total', async () => {
    // Chest ceiling is 22; the latest week is 24
    render(<Progress />);

    expect(await screen.findByText('24/22')).toBeInTheDocument();
  });

  it('shows best lifts with the dates they were set', async () => {
    render(<Progress />);

    expect(await screen.findByText('Best Lifts')).toBeInTheDocument();
    expect(screen.getAllByText(/Barbell Bench Press/).length).toBeGreaterThan(0);
    expect(screen.getByText('235 lbs × 5')).toBeInTheDocument();
  });

  it('labels weights in the unit the lifter logs in', async () => {
    mockAuth(JSON.stringify({ weight_unit: 'kg' }));
    render(<Progress />);

    expect(await screen.findByText('275 kg')).toBeInTheDocument();
    expect(screen.queryByText('275 lbs')).not.toBeInTheDocument();
  });

  it('says so when the data cannot be loaded', async () => {
    vi.mocked(analytics.getOverview).mockRejectedValue({ status: 500, detail: 'boom' });
    render(<Progress />);

    expect(await screen.findByText(/could not load your progress/i)).toBeInTheDocument();
  });

  it('reloads the chart when a different exercise is picked', async () => {
    vi.mocked(analytics.getTrainedExercises).mockResolvedValue([
      { id: 1, name: 'Barbell Bench Press', muscle_group: 'Chest' },
      { id: 2, name: 'Barbell Squat', muscle_group: 'Quadriceps' },
    ]);
    const { container } = render(<Progress />);
    await screen.findByText('275 lbs');

    const select = container.querySelector('select')!;
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(select, { target: { value: '2' } });

    await waitFor(() =>
      expect(analytics.getStrengthHistory).toHaveBeenCalledWith(2, 'test-token')
    );
  });
});
