import { describe, expect, it } from 'vitest';
import {
  ceilingForMuscleGroup,
  computeTargetRir,
  computeWeeklyVolumeByMuscleGroup,
  DELOAD_TARGET_RIR,
  findVolumeWarnings,
  WEEKLY_SET_CEILINGS,
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
