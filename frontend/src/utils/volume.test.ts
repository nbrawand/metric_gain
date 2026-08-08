import { describe, expect, it } from 'vitest';
import {
  ceilingForMuscleGroup,
  computeTargetRir,
  computeWeeklyVolumeByMuscleGroup,
  DELOAD_TARGET_RIR,
  findVolumeWarnings,
  projectAutoregulatedVolume,
  volumeInputsForTemplate,
  WEEKLY_SET_CEILINGS,
  weeklyVolumeProjection,
} from './volume';

describe('computeWeeklyVolumeByMuscleGroup', () => {
  it('sums sets across every exercise in a muscle group', () => {
    const result = computeWeeklyVolumeByMuscleGroup(
      [
        { muscleGroup: 'Chest', targetSets: 3, increment: 0 },
        { muscleGroup: 'Chest', targetSets: 2, increment: 0 },
        { muscleGroup: 'Back', targetSets: 4, increment: 0 },
      ],
      3
    );
    expect(result.Chest).toEqual([5, 5, 5]);
    expect(result.Back).toEqual([4, 4, 4]);
  });

  it('rounds half-set increments up, matching the backend', () => {
    // 3, 3.5, 4, 4.5, 5, 5.5 -> 3, 4, 4, 5, 5, 6
    const result = computeWeeklyVolumeByMuscleGroup(
      [{ muscleGroup: 'Chest', targetSets: 3, increment: 0.5 }],
      6
    );
    expect(result.Chest).toEqual([3, 4, 4, 5, 5, 6]);
  });

  it('survives a partially typed week count', () => {
    // The create form binds this to a number input mid-edit; Array(NaN) throws
    expect(computeWeeklyVolumeByMuscleGroup([{ muscleGroup: 'Chest', targetSets: 3, increment: 0 }], NaN))
      .toEqual({ Chest: [] });
  });

  it('never drops below one set', () => {
    const result = computeWeeklyVolumeByMuscleGroup(
      [{ muscleGroup: 'Chest', targetSets: 0, increment: 0 }],
      2
    );
    expect(result.Chest).toEqual([1, 1]);
  });
});

describe('computeTargetRir', () => {
  it('ramps 3 down to 0 across the training weeks', () => {
    expect([1, 2, 3, 4].map((w) => computeTargetRir(w, 4))).toEqual([3, 2, 1, 0]);
  });

  it('rounds half steps up, matching the backend', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((w) => computeTargetRir(w, 7)))
      .toEqual([3, 3, 2, 2, 1, 1, 0]);
  });

  it('puts the deload week above the ramp rather than on it', () => {
    // A week past the plan is recovery; the point is to stop short of failure
    expect(computeTargetRir(7, 6)).toBe(DELOAD_TARGET_RIR);
    expect(computeTargetRir(6, 6)).toBe(0);
  });

  it('handles degenerate inputs without producing a negative RIR', () => {
    expect(computeTargetRir(1, 1)).toBe(0);
    expect(computeTargetRir(1, 0)).toBe(0);
    expect(computeTargetRir(NaN, 6)).toBe(0);
  });
});

describe('findVolumeWarnings', () => {
  it('flags the case the ceilings exist for', () => {
    // Five chest exercises at 3 starting sets, +2/week
    const volume = computeWeeklyVolumeByMuscleGroup(
      Array.from({ length: 5 }, () => ({ muscleGroup: 'Chest', targetSets: 3, increment: 2 })),
      6
    );
    expect(volume.Chest).toEqual([15, 25, 35, 45, 55, 65]);

    const [warning] = findVolumeWarnings(volume);
    expect(warning.muscleGroup).toBe('Chest');
    expect(warning.ceiling).toBe(22);
    expect(warning.peakSets).toBe(65);
    expect(warning.peakWeek).toBe(6);
    // Where the fix belongs, which is more useful than where the peak is
    expect(warning.firstExceededWeek).toBe(2);
  });

  it('says nothing about an ordinary plan', () => {
    const volume = computeWeeklyVolumeByMuscleGroup(
      [
        { muscleGroup: 'Chest', targetSets: 3, increment: 0.5 },
        { muscleGroup: 'Back', targetSets: 4, increment: 0.5 },
      ],
      6
    );
    expect(findVolumeWarnings(volume)).toEqual([]);
  });

  it('orders the worst overshoot first', () => {
    const volume = {
      Triceps: [20, 20],   // ceiling 18, over by 2
      Chest: [40, 40],     // ceiling 22, over by 18
      Hamstrings: [9, 9],  // ceiling 16, fine
    };
    expect(findVolumeWarnings(volume).map((w) => w.muscleGroup)).toEqual(['Chest', 'Triceps']);
  });

  it('treats the ceiling itself as acceptable', () => {
    expect(findVolumeWarnings({ Chest: [WEEKLY_SET_CEILINGS.Chest] })).toEqual([]);
    expect(findVolumeWarnings({ Chest: [WEEKLY_SET_CEILINGS.Chest + 1] })).toHaveLength(1);
  });
});

describe('ceilingForMuscleGroup', () => {
  it('uses the published ceiling for known groups', () => {
    expect(ceilingForMuscleGroup('Chest')).toBe(22);
    expect(ceilingForMuscleGroup('Hamstrings')).toBe(16);
  });

  it('falls back for anything unrecognised', () => {
    expect(ceilingForMuscleGroup('Grip')).toBe(25);
    expect(ceilingForMuscleGroup('')).toBe(25);
  });
});

describe('volumeInputsForTemplate', () => {
  const days = [
    {
      exercises: [
        { exercise_id: 1, target_sets: 3, weekly_set_increment: 2 },
        { exercise_id: 2, target_sets: 4, weekly_set_increment: 1 },
      ],
    },
    { exercises: [{ exercise_id: 1, target_sets: 2, weekly_set_increment: 0.5 }] },
  ];
  const groups: Record<number, string> = { 1: 'Chest', 2: 'Back' };
  const lookup = (id: number) => groups[id];

  it('flattens every day into per-exercise inputs', () => {
    const inputs = volumeInputsForTemplate(days, lookup);
    expect(inputs).toHaveLength(3);
    expect(inputs[0]).toEqual({ muscleGroup: 'Chest', targetSets: 3, increment: 2 });
  });

  it('carries the weekly increment through as written', () => {
    // Whether the increment means anything is the projection's decision: an
    // autoregulated block ignores it, but this function does not know that.
    const inputs = volumeInputsForTemplate(days, lookup);
    expect(inputs.map((i) => i.increment)).toEqual([2, 1, 0.5]);
    expect(inputs.map((i) => i.targetSets)).toEqual([3, 4, 2]);
  });

  it('falls back to Other for an exercise it cannot resolve', () => {
    const inputs = volumeInputsForTemplate(days, () => undefined);
    expect(inputs.every((i) => i.muscleGroup === 'Other')).toBe(true);
  });
});

describe('projectAutoregulatedVolume', () => {
  const chest = (targetSets: number) => ({ muscleGroup: 'Chest', targetSets });

  it('starts on the flat generated week', () => {
    // Autoregulated blocks generate flat, so week 1 has to agree exactly with
    // what the manual path draws for the same starting sets
    const exercises = [chest(3), chest(4)];
    const projected = projectAutoregulatedVolume(exercises, 4);
    const flat = computeWeeklyVolumeByMuscleGroup(
      exercises.map((e) => ({ ...e, increment: 0 })), 4
    );
    expect(projected.Chest[0]).toBe(flat.Chest[0]);
  });

  it('earns one set per exercise per week', () => {
    // Two chest exercises means two earned chest sets a week, which is the
    // per-muscle-group view the backend caps against
    expect(projectAutoregulatedVolume([chest(3), chest(4)], 4).Chest).toEqual([7, 9, 11, 13]);
  });

  it('stops at the muscle group ceiling', () => {
    // Chest tops out at 22. Three exercises from 6 each is 18, then 21, then
    // the fourth increase would pass the ceiling so it lands on it and holds.
    const weekly = projectAutoregulatedVolume([chest(6), chest(6), chest(6)], 6).Chest;
    expect(weekly).toEqual([18, 21, 22, 22, 22, 22]);
    expect(Math.max(...weekly)).toBeLessThanOrEqual(WEEKLY_SET_CEILINGS.Chest);
  });

  it('adds nothing to a group that already starts over its ceiling', () => {
    // Mirrors the backend check, which asks whether the total after adding
    // would exceed the limit, so an already-over group never grows
    const weekly = projectAutoregulatedVolume([chest(15), chest(15)], 3).Chest;
    expect(weekly).toEqual([30, 30, 30]);
  });

  it('caps each muscle group independently', () => {
    const weekly = projectAutoregulatedVolume(
      [chest(10), chest(10), { muscleGroup: 'Biceps', targetSets: 4 }], 5
    );
    // Chest ceiling 22, Biceps 20, and biceps has one exercise so it climbs
    // half as fast even though it starts well clear of its own limit
    expect(weekly.Chest).toEqual([20, 22, 22, 22, 22]);
    expect(weekly.Biceps).toEqual([4, 5, 6, 7, 8]);
  });

  it('never projects above what the warnings police', () => {
    // A capped projection is the honest one: autoregulation genuinely cannot
    // run a muscle group past its ceiling, so nothing should warn
    const weekly = projectAutoregulatedVolume([chest(5), chest(5), chest(5), chest(5)], 8);
    expect(findVolumeWarnings(weekly)).toEqual([]);
  });

  it('survives a half-typed week count', () => {
    expect(projectAutoregulatedVolume([chest(3)], NaN).Chest).toEqual([]);
  });
});

describe('weeklyVolumeProjection', () => {
  const days = [
    {
      exercises: [
        { exercise_id: 1, target_sets: 3, weekly_set_increment: 2 },
        { exercise_id: 2, target_sets: 4, weekly_set_increment: 1 },
      ],
    },
  ];
  const lookup = (id: number) => (id === 1 ? 'Chest' : 'Back');
  const inputs = volumeInputsForTemplate(days, lookup);

  it('follows the fixed increases when not autoregulating', () => {
    expect(weeklyVolumeProjection(inputs, 4, false).Chest).toEqual([3, 5, 7, 9]);
  });

  it('ignores the fixed increases when autoregulating', () => {
    // The template's +2/week is not what an autoregulated block does; it earns
    // one set per exercise per clean week instead
    expect(weeklyVolumeProjection(inputs, 4, true).Chest).toEqual([3, 4, 5, 6]);
  });
});
