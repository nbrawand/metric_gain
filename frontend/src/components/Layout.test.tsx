import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stores/authStore');
vi.mock('../api/mesocycles');
vi.mock('../api/workoutSessions');

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  Outlet: () => <div />,
}));

import { getActiveMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions } from '../api/workoutSessions';
import { useAuthStore } from '../stores/authStore';
import Layout from './Layout';

const setUser = (authenticated: boolean) => {
  vi.mocked(useAuthStore).mockReturnValue({
    logout: vi.fn(),
    accessToken: authenticated ? 'token' : null,
    isAuthenticated: authenticated,
    user: authenticated
      ? {
          email: 'lifter@example.com',
          // The tallest the footer gets: presets render only when enabled
          preferences: JSON.stringify({ rest_timer_enabled: true, rest_timer_seconds: 120 }),
        }
      : null,
    updatePreferences: vi.fn(),
  } as unknown as ReturnType<typeof useAuthStore>);
};

// Layout fetches the active block on mount; flush it before asserting so the
// state update it makes does not land outside act().
const renderMenu = async (authenticated: boolean) => {
  setUser(authenticated);
  const result = render(<Layout />);
  await act(async () => {});
  fireEvent.click(screen.getByLabelText('Open menu'));
  return result;
};

const scrollRegionFor = (element: HTMLElement): HTMLElement | null => {
  let node = element.parentElement;
  while (node) {
    if (node.className.includes?.('overflow-y-auto')) return node;
    node = node.parentElement;
  }
  return null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveMesocycleInstance).mockRejectedValue(new Error('no active block'));
  vi.mocked(listWorkoutSessions).mockResolvedValue([]);
});

describe('menu panel scrolling', () => {
  // The footer used to be a fixed block under a non-scrolling nav, so on a
  // short viewport it was pushed past the bottom edge with no way to reach it.
  it('puts sign out inside a scrollable region', async () => {
    await renderMenu(true);

    const signOut = screen.getByRole('button', { name: 'Sign Out' });
    expect(scrollRegionFor(signOut)).not.toBeNull();
  });

  it('scrolls the nav and the footer together', async () => {
    await renderMenu(true);

    // Scrolling only the nav would still bury sign out: the footer on its own
    // is taller than a short viewport once the rest timer presets are showing.
    const signOut = screen.getByRole('button', { name: 'Sign Out' });
    const navItem = screen.getByRole('button', { name: 'Mesocycles' });
    expect(scrollRegionFor(signOut)).toBe(scrollRegionFor(navItem));
  });

  it('keeps sign in reachable when signed out', async () => {
    await renderMenu(false);

    const signIn = screen.getByRole('button', { name: 'Sign In' });
    expect(scrollRegionFor(signIn)).not.toBeNull();
  });

  it('caps the panel at the visible viewport height', async () => {
    const { container } = await renderMenu(true);

    // inset-0 sizes to the initial containing block, which on a phone can be
    // taller than what is on screen once browser chrome is counted.
    const panel = container.querySelector('.animate-slide-in-right');
    expect(panel?.className).toContain('max-h-dvh');
  });
});
