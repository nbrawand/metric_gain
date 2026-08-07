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

/**
 * Weekly set ceilings per muscle group — roughly where the published maximum
 * recoverable volume ranges top out for an intermediate lifter.
 *
 * These are guidance, not a hard limit: the app still builds whatever plan you
 * ask for. The point is that a plan generating 65 chest sets in week 6 is not
 * a plan anyone recovers from, and rendering that number without comment reads
 * as endorsement. Keys match Exercise.muscle_group in the seed library.
 */
export const WEEKLY_SET_CEILINGS: Record<string, number> = {
  Chest: 22,
  Back: 25,
  Shoulders: 26,
  Biceps: 20,
  Triceps: 18,
  Quadriceps: 20,
  Hamstrings: 16,
  Glutes: 16,
  Calves: 20,
  Core: 25,
  Forearms: 15,
  Traps: 20,
};

/** Anything without a published range gets the mildest ceiling we use. */
export const DEFAULT_WEEKLY_SET_CEILING = 25;

export const ceilingForMuscleGroup = (muscleGroup: string): number =>
  WEEKLY_SET_CEILINGS[muscleGroup] ?? DEFAULT_WEEKLY_SET_CEILING;

export interface VolumeWarning {
  muscleGroup: string;
  ceiling: number;
  /** Highest weekly total the plan reaches for this group. */
  peakSets: number;
  /** 1-based week the peak falls in. */
  peakWeek: number;
  /** 1-based first week that crosses the ceiling. */
  firstExceededWeek: number;
}

/**
 * Muscle groups whose weekly sets run past a recoverable ceiling, worst first.
 *
 * Reports the first week it happens as well as the peak, because "week 6 hits
 * 65" is much less actionable than "you cross the line in week 3".
 */
export const findVolumeWarnings = (
  volumeByMuscleGroup: Record<string, number[]>
): VolumeWarning[] => {
  const warnings: VolumeWarning[] = [];

  for (const [muscleGroup, weeklySets] of Object.entries(volumeByMuscleGroup)) {
    const ceiling = ceilingForMuscleGroup(muscleGroup);
    let peakSets = 0;
    let peakWeek = 0;
    let firstExceededWeek = 0;

    weeklySets.forEach((sets, index) => {
      if (sets > peakSets) {
        peakSets = sets;
        peakWeek = index + 1;
      }
      if (sets > ceiling && firstExceededWeek === 0) {
        firstExceededWeek = index + 1;
      }
    });

    if (firstExceededWeek > 0) {
      warnings.push({ muscleGroup, ceiling, peakSets, peakWeek, firstExceededWeek });
    }
  }

  // Worst overshoot first, so the most urgent one is read first
  return warnings.sort(
    (a, b) => b.peakSets - b.ceiling - (a.peakSets - a.ceiling)
  );
};

export interface VolumeInputSource {
  exercises: { exercise_id: number; target_sets: number; weekly_set_increment: number }[];
}

/**
 * Turn a template's days into the per-exercise inputs the volume chart wants.
 *
 * autoregulate zeroes the weekly increment: an autoregulated block generates
 * flat and grows from what gets logged, so charting the template's ramp would
 * show a plan that will not happen.
 */
export const volumeInputsForTemplate = (
  days: VolumeInputSource[],
  muscleGroupFor: (exerciseId: number) => string | undefined,
  autoregulate: boolean
): { muscleGroup: string; targetSets: number; increment: number }[] =>
  days.flatMap((day) =>
    day.exercises.map((exercise) => ({
      muscleGroup: muscleGroupFor(exercise.exercise_id) || 'Other',
      targetSets: exercise.target_sets,
      increment: autoregulate ? 0 : (exercise.weekly_set_increment ?? 0),
    }))
  );
