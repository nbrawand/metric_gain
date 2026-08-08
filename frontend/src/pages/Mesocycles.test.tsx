import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/mesocycles');
vi.mock('../api/exercises');
vi.mock('../api/workoutSessions');
vi.mock('../stores/authStore');

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import * as mesocyclesApi from '../api/mesocycles';
import * as exercisesApi from '../api/exercises';
import * as sessionsApi from '../api/workoutSessions';
import { useAuthStore } from '../stores/authStore';
import Mesocycles from './Mesocycles';

const template = {
  id: 1,
  name: 'Upper Lower',
  description: 'Four days',
  weeks: 4,
  days_per_week: 2,
  is_template: false,
  user_id: 1,
  created_at: '2026-08-01T00:00:00',
  updated_at: '2026-08-01T00:00:00',
};

const exercise = { id: 7, name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' };

const finishedInstance = {
  id: 9,
  mesocycle_template_id: 1,
  name: 'Upper Lower',
  status: 'completed',
  start_date: '2026-06-01',
  current_week: 4,
  weeks: 4,
  total_weeks: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  vi.stubGlobal('alert', vi.fn());
  // This page reads the store through a selector, so the mock has to apply it.
  // Returning the whole state regardless sent the entire store object where an
  // access token was expected.
  const authState = { accessToken: 'token', user: { id: 1, preferences: '{}' } };
  vi.mocked(useAuthStore).mockImplementation(
    ((selector?: (s: typeof authState) => unknown) =>
      selector ? selector(authState) : authState) as unknown as typeof useAuthStore
  );
  vi.mocked(mesocyclesApi.listMesocycles).mockResolvedValue([template] as never);
  vi.mocked(mesocyclesApi.listMesocycleInstances).mockResolvedValue([] as never);
  vi.mocked(exercisesApi.getExercises).mockResolvedValue([exercise] as never);
  vi.mocked(mesocyclesApi.deleteMesocycle).mockResolvedValue(undefined as never);
  // The start modal fetches the template to draw its volume preview. Leaving
  // this auto-mocked returns undefined, and the component calls .then on it,
  // which throws inside an event handler where it is easy to miss locally and
  // fails the test outright on CI.
  vi.mocked(mesocyclesApi.getMesocycle).mockResolvedValue({
    ...template,
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
            target_sets: 3,
            weekly_set_increment: 0,
            target_reps_min: 8,
            target_reps_max: 10,
            starting_rir: 3,
            ending_rir: 0,
          },
        ],
      },
    ],
  } as never);
  vi.mocked(mesocyclesApi.startMesocycleInstance).mockResolvedValue({ id: 20 } as never);
  vi.mocked(sessionsApi.listWorkoutSessions).mockResolvedValue([
    { id: 101, week_number: 2, day_number: 1 },
    { id: 100, week_number: 1, day_number: 1 },
    { id: 102, week_number: 1, day_number: 2 },
  ] as never);
});

const loaded = async () => {
  render(<Mesocycles />);
  // The template list starts collapsed, so open it before looking for cards
  await waitFor(() => expect(screen.getByRole('button', { name: /^Templates/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /^Templates/ }));
  await waitFor(() => expect(screen.getByText('Upper Lower')).toBeInTheDocument());
};

const deleteButton = () => screen.getByRole('button', { name: 'Delete' });

describe('Mesocycles deletion', () => {
  it('asks before destroying a template', async () => {
    await loaded();
    fireEvent.click(deleteButton());

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mesocyclesApi.deleteMesocycle).toHaveBeenCalledWith(1, 'token'));
  });

  it('does nothing when the confirmation is declined', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    await loaded();
    fireEvent.click(deleteButton());

    expect(mesocyclesApi.deleteMesocycle).not.toHaveBeenCalled();
    expect(screen.getByText('Upper Lower')).toBeInTheDocument();
  });

  it('removes the template from the list once the server took it', async () => {
    await loaded();
    fireEvent.click(deleteButton());
    await waitFor(() => expect(screen.queryByText('Upper Lower')).not.toBeInTheDocument());
  });

  it('keeps the template listed when the delete fails', async () => {
    vi.mocked(mesocyclesApi.deleteMesocycle).mockRejectedValue({ detail: 'nope', status: 500 });
    await loaded();
    fireEvent.click(deleteButton());

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(screen.getByText('Upper Lower')).toBeInTheDocument();
  });
});

describe('Mesocycles starting a block', () => {
  const startIt = async () => {
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Start Mesocycle' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start Fresh' }));
  };

  it('opens on the first session of week one, not whatever came back first', async () => {
    // listWorkoutSessions returns them out of order on purpose here
    await startIt();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/workout/100'));
  });

  it('autoregulates by default', async () => {
    await startIt();
    await waitFor(() => expect(mesocyclesApi.startMesocycleInstance).toHaveBeenCalled());
    const [payload] = vi.mocked(mesocyclesApi.startMesocycleInstance).mock.calls[0];
    expect(payload).toMatchObject({ mesocycle_template_id: 1, autoregulate_volume: true });
  });

  it('dates the block by local time, not UTC', async () => {
    // 21:30 on the 6th in Los Angeles is already the 7th in UTC. Without a
    // fixed instant this assertion is vacuous for most of the day, and in CI
    // (which runs in UTC) it could never fail at all. Only Date is faked;
    // faking timers wholesale would hang waitFor.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-07T04:30:00Z'));
    try {
      await startIt();
      await waitFor(() => expect(mesocyclesApi.startMesocycleInstance).toHaveBeenCalled());
      const [payload] = vi.mocked(mesocyclesApi.startMesocycleInstance).mock.calls[0];
      expect(payload.start_date).toBe('2026-08-06');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses to start a second block while one is running', async () => {
    // Blocked in the UI rather than by an alert after the fact: two live
    // blocks would have two sets of sessions competing for the same days
    vi.mocked(mesocyclesApi.listMesocycleInstances).mockResolvedValue([
      { ...finishedInstance, status: 'active' },
    ] as never);
    await loaded();

    const blocked = screen.getByRole('button', { name: /Finish Your Current Mesocycle First/i });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(mesocyclesApi.startMesocycleInstance).not.toHaveBeenCalled();
  });

  it('allows a new block once the last one is finished', async () => {
    vi.mocked(mesocyclesApi.listMesocycleInstances).mockResolvedValue([finishedInstance] as never);
    await startIt();

    await waitFor(() => expect(mesocyclesApi.startMesocycleInstance).toHaveBeenCalled());
  });

  it('says so rather than failing silently when the server refuses', async () => {
    vi.mocked(mesocyclesApi.startMesocycleInstance).mockRejectedValue({
      detail: 'Subscription required',
      status: 402,
    });
    await startIt();

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Subscription required/))
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

const activeInstance = {
  id: 5,
  mesocycle_template_id: 1,
  name: 'Upper Lower',
  status: 'active',
  start_date: '2026-08-01',
  current_week: 1,
  weeks: 4,
  total_weeks: 5,
};

/** Fill in the create form far enough to submit it, then submit. */
const createTemplate = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Create Mesocycle Template' }));
  fireEvent.change(screen.getByLabelText(/Template Name/), { target: { value: 'New Block' } });
  // Every training day needs an exercise before the form will move on
  screen
    .getAllByRole('button', { name: '+ Add Exercise' })
    .forEach((button) => fireEvent.click(button));
  fireEvent.click(screen.getByRole('button', { name: 'Review Plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create' }));
};

describe('creating a template', () => {
  beforeEach(() => {
    vi.mocked(mesocyclesApi.createMesocycle).mockResolvedValue({ id: 42 } as never);
  });

  it('starts the new block and sends the lifter home', async () => {
    await loaded();
    await createTemplate();

    await waitFor(() =>
      expect(mesocyclesApi.startMesocycleInstance).toHaveBeenCalledWith(
        expect.objectContaining({ mesocycle_template_id: 42 }),
        'token'
      )
    );
    expect(navigate).toHaveBeenCalledWith('/', {
      state: { flash: 'Mesocycle created and started.' },
    });
  });

  it('saves the volume mode the form collected', async () => {
    // The toggle was read by the review chart but dropped from the payload, so
    // unticking it changed the preview and nothing else
    await loaded();
    await createTemplate();

    await waitFor(() =>
      expect(mesocyclesApi.createMesocycle).toHaveBeenCalledWith(
        expect.objectContaining({ autoregulate_volume: true }),
        'token'
      )
    );
  });

  it('does not start a second block over one already running', async () => {
    vi.mocked(mesocyclesApi.listMesocycleInstances).mockResolvedValue([activeInstance] as never);
    await loaded();
    await createTemplate();

    await waitFor(() => expect(mesocyclesApi.createMesocycle).toHaveBeenCalled());
    expect(mesocyclesApi.startMesocycleInstance).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith('/', expect.anything());
    expect(await screen.findByText(/Mesocycle created\./)).toBeInTheDocument();
  });

  it('keeps the lifter here when the template saved but the block did not start', async () => {
    vi.mocked(mesocyclesApi.startMesocycleInstance).mockRejectedValue(new Error('boom'));
    await loaded();
    await createTemplate();

    expect(await screen.findByText(/starting it failed/i)).toBeInTheDocument();
    // Creating did work, so it must not be reported as a failure to create
    expect(window.alert).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith('/', expect.anything());
  });
});

const secondTemplate = {
  ...template,
  id: 2,
  name: 'Glute Focus',
  description: 'Lower body emphasis',
};

const searchBox = () => screen.getByLabelText('Search templates');

describe('template list sections', () => {
  it('starts collapsed so the page opens on the directions', async () => {
    render(<Mesocycles />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Templates/ })).toBeInTheDocument()
    );
    expect(screen.queryByText('Upper Lower')).not.toBeInTheDocument();
    expect(screen.getByText(/How to build a mesocycle/i)).toBeInTheDocument();
  });

  it('opens and closes on the header', async () => {
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: /^Templates/ }));
    expect(screen.queryByText('Upper Lower')).not.toBeInTheDocument();
  });

  it('keeps past mesocycles closed until asked for', async () => {
    vi.mocked(mesocyclesApi.listMesocycleInstances).mockResolvedValue([finishedInstance] as never);
    await loaded();

    const past = screen.getByRole('button', { name: /^Past Mesocycles/ });
    expect(past).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(past);
    expect(past).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('template search', () => {
  beforeEach(() => {
    vi.mocked(mesocyclesApi.listMesocycles).mockResolvedValue([
      template,
      secondTemplate,
    ] as never);
  });

  it('reveals matches inside the collapsed section', async () => {
    render(<Mesocycles />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Templates/ })).toBeInTheDocument()
    );
    // Never opened by hand: searching a closed list has to find something
    fireEvent.change(searchBox(), { target: { value: 'glute' } });

    expect(screen.getByText('Glute Focus')).toBeInTheDocument();
    expect(screen.queryByText('Upper Lower')).not.toBeInTheDocument();
  });

  it('matches on the description too', async () => {
    render(<Mesocycles />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Templates/ })).toBeInTheDocument()
    );
    fireEvent.change(searchBox(), { target: { value: 'lower body' } });

    expect(screen.getByText('Glute Focus')).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    await loaded();
    fireEvent.change(searchBox(), { target: { value: 'zzz' } });

    expect(screen.getByText(/No templates match/i)).toBeInTheDocument();
  });

  it('goes back to the collapsed state when the box is cleared', async () => {
    render(<Mesocycles />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Templates/ })).toBeInTheDocument()
    );
    fireEvent.change(searchBox(), { target: { value: 'glute' } });
    fireEvent.change(searchBox(), { target: { value: '' } });

    expect(screen.queryByText('Glute Focus')).not.toBeInTheDocument();
  });
});
