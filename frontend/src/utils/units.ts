/**
 * Weight unit preference. Must match app/services/progression.py.
 *
 * Weights are stored as the number the lifter typed, so the unit is a property
 * of the user rather than of each row. Switching units converts the stored
 * history server-side; without that a 225 lb squat would silently become a
 * 225 kg one.
 */

export type WeightUnit = 'lb' | 'kg';

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'lb';

/** Read the unit out of the user's preferences JSON, falling back to pounds. */
export const weightUnitFromPreferences = (
  preferences: string | null | undefined
): WeightUnit => {
  if (!preferences) return DEFAULT_WEIGHT_UNIT;
  try {
    const parsed = JSON.parse(preferences);
    return parsed?.weight_unit === 'kg' ? 'kg' : DEFAULT_WEIGHT_UNIT;
  } catch {
    return DEFAULT_WEIGHT_UNIT;
  }
};

/** "lbs" reads naturally in prose; "kg" is already both singular and plural. */
export const weightUnitLabel = (unit: WeightUnit): string =>
  unit === 'kg' ? 'kg' : 'lbs';


/**
 * Rest timer preference. Off by default — the app's stance is that you rest
 * until you are ready rather than until a clock says so, and that stays the
 * default for anyone who never opts in.
 */
export interface RestTimerPreference {
  enabled: boolean;
  seconds: number;
}

export const DEFAULT_REST_TIMER: RestTimerPreference = { enabled: false, seconds: 120 };

/** Durations offered in settings. Lives here, not in the component: a
 * component file that also exports constants breaks React fast refresh. */
export const REST_TIMER_PRESETS = [60, 90, 120, 180, 240];

export const restTimerFromPreferences = (
  preferences: string | null | undefined
): RestTimerPreference => {
  if (!preferences) return DEFAULT_REST_TIMER;
  try {
    const parsed = JSON.parse(preferences);
    const seconds = Number(parsed?.rest_timer_seconds);
    return {
      enabled: parsed?.rest_timer_enabled === true,
      seconds: Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : DEFAULT_REST_TIMER.seconds,
    };
  } catch {
    return DEFAULT_REST_TIMER;
  }
};
