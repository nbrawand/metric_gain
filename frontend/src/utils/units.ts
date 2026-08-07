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
