import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RestTimer from './RestTimer';

describe('RestTimer', () => {
  beforeEach(() => {
    // Not shouldAdvanceTime: that lets the interval fire outside act() and
    // React warns about the resulting state update. userEvent is given an
    // explicit advance function instead.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing until a set is logged', () => {
    // startToken 0 means the timer has never run this session
    render(<RestTimer startToken={0} seconds={120} onDismiss={() => {}} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('counts down once started', () => {
    render(<RestTimer startToken={1} seconds={120} onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('2:00');

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole('status')).toHaveTextContent('1:30');
  });

  it('pads seconds so the clock does not read 1:5', () => {
    render(<RestTimer startToken={1} seconds={65} onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('1:05');
  });

  it('counts up past zero instead of freezing', () => {
    // Stopping at 0:00 tells you nothing about how long you have actually rested
    render(<RestTimer startToken={1} seconds={60} onDismiss={() => {}} />);

    act(() => { vi.advanceTimersByTime(90_000); });
    const status = screen.getByRole('status');
    // Uppercased by CSS, so the text content itself is title case
    expect(status).toHaveTextContent(/rested/i);
    expect(status).toHaveTextContent('+0:30');
  });

  it('tracks wall-clock time rather than counting ticks', () => {
    /**
     * Browsers throttle timers in background tabs and phones lock mid-set. A
     * decrementing counter would fall behind real time exactly when the timer
     * is being relied on.
     */
    const start = new Date('2026-08-07T10:00:00Z');
    vi.setSystemTime(start);
    render(<RestTimer startToken={1} seconds={120} onDismiss={() => {}} />);

    // Jump the clock forward without letting the interval fire in between
    vi.setSystemTime(new Date(start.getTime() + 75_000));
    act(() => { vi.advanceTimersByTime(250); });

    expect(screen.getByRole('status')).toHaveTextContent('0:45');
  });

  it('restarts from the top when asked', () => {
    render(<RestTimer startToken={1} seconds={120} onDismiss={() => {}} />);

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole('status')).toHaveTextContent('1:00');

    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(screen.getByRole('status')).toHaveTextContent('2:00');
  });

  it('disappears when dismissed', () => {
    const onDismiss = vi.fn();
    render(<RestTimer startToken={1} seconds={120} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('restarts when another set is logged', () => {
    const { rerender } = render(
      <RestTimer startToken={1} seconds={120} onDismiss={() => {}} />
    );
    act(() => { vi.advanceTimersByTime(90_000); });
    expect(screen.getByRole('status')).toHaveTextContent('0:30');

    // A new token is what the workout screen bumps on each saved set
    rerender(<RestTimer startToken={2} seconds={120} onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('2:00');
  });
});
