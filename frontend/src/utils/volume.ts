/**
 * Set-count plan helpers. Must match backend app/services/progression.py.
 */

/**
 * Sets for week N = round_half_up(target_sets + increment * (N - 1)), min 1.
 * Math.round rounds .5 up, matching the backend's int(x + 0.5).
 */
const computeSetsForWeek = (
  targetSets: number,
  increment: number,
  week: number
): number => Math.max(1, Math.round(targetSets + increment * (week - 1)));

/**
 * Aggregate weekly set totals per muscle group for a template's exercises.
 * Returns muscle group -> [week1Total, week2Total, ...].
 */
export const computeWeeklyVolumeByMuscleGroup = (
  exercises: { muscleGroup: string; targetSets: number; increment: number }[],
  weeks: number
): Record<string, number[]> => {
  // A partially-typed week count must not reach Array(), which throws on NaN.
  const weekCount = Number.isFinite(weeks) ? Math.max(0, Math.floor(weeks)) : 0;
  const result: Record<string, number[]> = {};
  for (const ex of exercises) {
    if (!result[ex.muscleGroup]) {
      result[ex.muscleGroup] = Array(weekCount).fill(0);
    }
    for (let week = 1; week <= weekCount; week++) {
      result[ex.muscleGroup][week - 1] += computeSetsForWeek(ex.targetSets, ex.increment, week);
    }
  }
  return result;
};

/** RIR asked for during the deload week. Must match DELOAD_TARGET_RIR. */
export const DELOAD_TARGET_RIR = 4;

/**
 * Target RIR for a week: ramps 3 -> 0 across the training weeks, clamped to
 * 0-3. Mirrors compute_target_rir, including the clamp — without it a week
 * number outside the block's range renders a negative or above-3 RIR.
 *
 * trainingWeeks is the planned week count, NOT the span including the deload.
 * A week past it is the deload, which sits above the ramp: the point of that
 * week is to stop well short of failure.
 */
export const computeTargetRir = (week: number, trainingWeeks: number): number => {
  if (!Number.isFinite(week) || !Number.isFinite(trainingWeeks)) return 0;
  if (trainingWeeks > 0 && week > trainingWeeks) return DELOAD_TARGET_RIR;
  if (trainingWeeks <= 1) return 0;
  return Math.max(
    0,
    Math.min(3, Math.round((3 * (trainingWeeks - week)) / (trainingWeeks - 1)))
  );
};
