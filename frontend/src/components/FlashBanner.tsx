import { useEffect } from 'react';

interface FlashBannerProps {
  message: string;
  onDismiss: () => void;
  /** How long before it clears itself. */
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 6000;

/**
 * A short confirmation that clears itself.
 *
 * Deliberately not an alert(): confirming something that worked should not
 * need a click to get rid of, and alert() blocks the navigation that follows.
 */
export default function FlashBanner({
  message,
  onDismiss,
  durationMs = DEFAULT_DURATION_MS,
}: FlashBannerProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // Re-armed per message, so a second confirmation gets its full time rather
    // than inheriting what was left of the first one's
  }, [message, durationMs, onDismiss]);

  return (
    <div
      role="status"
      className="bg-teal-700 text-white px-4 py-3 flex items-center justify-between gap-4"
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={onDismiss}
        className="text-teal-100 hover:text-white text-lg leading-none shrink-0"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
