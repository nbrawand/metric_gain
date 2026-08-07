/**
 * Set-count plan helpers. Must match backend app/services/progression.py.
 */

/**
 * Sets for week N = round_half_up(target_sets + increment * (N - 1)), min 1.
 * Math.round rounds .5 up, matching the backend's int(x + 0.5).
 */
export const computeSetsForWeek = (
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
