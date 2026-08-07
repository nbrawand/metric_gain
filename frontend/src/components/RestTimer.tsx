/**
 * Countdown between sets. Opt-in, and off by default.
 *
 * The app's stance is that you rest until you are ready rather than until a
 * clock says so, and that stays the default. But training without any sense of
 * elapsed time is its own problem, and a timer is one of the most-requested
 * things missing here — so it exists for people who want it, and is invisible
 * to everyone else.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const REST_TIMER_PRESETS = [60, 90, 120, 180, 240];
export const DEFAULT_REST_SECONDS = 120;

const formatClock = (totalSeconds: number): string => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

interface RestTimerProps {
  /** Bumped each time a set is logged; restarts the countdown. */
  startToken: number;
  seconds: number;
  onDismiss: () => void;
}

export default function RestTimer({ startToken, seconds, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  // Wall-clock deadline rather than a decrementing counter: browsers throttle
  // timers in background tabs, and a phone screen locking mid-rest would
  // otherwise leave the count minutes behind real time.
  const deadlineRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (deadlineRef.current === null) return;
    const left = Math.round((deadlineRef.current - Date.now()) / 1000);
    setRemaining(left);
  }, []);

  useEffect(() => {
    if (startToken === 0) return;
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }, [startToken, seconds]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, 250);
    // Recompute immediately on return, rather than waiting for the next tick
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, tick]);

  if (!running) return null;

  const done = remaining <= 0;
  // Counts up once it passes zero, so an overrun reads as "you have been
  // resting 3:40" instead of freezing at 0:00
  const label = done ? `+${formatClock(Math.abs(remaining))}` : formatClock(remaining);
  const progress = done ? 100 : ((seconds - remaining) / seconds) * 100;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-lg shadow-lg border ${
        done ? 'bg-teal-900/95 border-teal-500' : 'bg-gray-800/95 border-gray-600'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            {done ? 'Rested' : 'Rest'}
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${done ? 'text-teal-300' : 'text-white'}`}
          >
            {label}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              deadlineRef.current = Date.now() + seconds * 1000;
              setRemaining(seconds);
            }}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded"
          >
            Restart
          </button>
          <button
            onClick={() => {
              setRunning(false);
              deadlineRef.current = null;
              onDismiss();
            }}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div className="h-1 bg-gray-700 rounded-b overflow-hidden">
        <div
          className={done ? 'h-full bg-teal-400' : 'h-full bg-teal-500'}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
