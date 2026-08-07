/**
 * Plate loading and warmup ramps.
 *
 * Both answer questions the app was making the lifter do in their head while
 * standing at the rack: what goes on the bar, and how do I get there.
 */

import type { WeightUnit } from './units';

/** Plates a commercial gym actually stocks, heaviest first. */
export const PLATES: Record<WeightUnit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

/** Standard barbell weight. */
export const BAR_WEIGHT: Record<WeightUnit, number> = { lb: 45, kg: 20 };

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateLoading {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: PlateCount[];
  /** What the bar actually weighs once loaded, which may undershoot the target. */
  achievable: number;
  /** Target minus achievable. Non-zero means no combination of plates hits it. */
  shortfall: number;
  /** True when the target is below the bar itself. */
  belowBar: boolean;
}

/**
 * Which plates to put on each side to reach a target weight.
 *
 * Greedy from the heaviest plate down, which is both how people actually load
 * a bar and optimal for the plate sets above, since each is a multiple of the
 * next.
 */
export const computePlateLoading = (
  target: number,
  unit: WeightUnit,
  barWeight = BAR_WEIGHT[unit]
): PlateLoading => {
  if (!Number.isFinite(target) || target <= 0) {
    return { perSide: [], achievable: 0, shortfall: 0, belowBar: false };
  }
  if (target < barWeight) {
    // Dumbbells, machines and the empty bar all land here; there is nothing to
    // load, and pretending otherwise would be worse than saying so
    return { perSide: [], achievable: barWeight, shortfall: 0, belowBar: true };
  }

  let remainingPerSide = (target - barWeight) / 2;
  const perSide: PlateCount[] = [];

  for (const plate of PLATES[unit]) {
    const count = Math.floor(remainingPerSide / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      remainingPerSide -= count * plate;
    }
  }

  const loaded = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const achievable = barWeight + loaded * 2;
  return {
    perSide,
    achievable,
    // Rounded because plate arithmetic in binary floating point drifts
    shortfall: Math.round((target - achievable) * 100) / 100,
    belowBar: false,
  };
};

export interface WarmupSet {
  weight: number;
  reps: number;
  /** Percentage of the working weight, for display. */
  percent: number;
}

/**
 * Ramp from an empty bar up to the working weight.
 *
 * Percentages and reps follow the usual shape: high reps light, dropping to a
 * single as the weight approaches working. Light working weights get fewer
 * steps, because warming up to 65 lb in four stages is a waste of a session.
 */
export const computeWarmupSets = (
  workingWeight: number,
  unit: WeightUnit,
  barWeight = BAR_WEIGHT[unit]
): WarmupSet[] => {
  if (!Number.isFinite(workingWeight) || workingWeight <= 0) return [];

  const ratio = workingWeight / barWeight;
  // Barely above the bar: one easy set is the whole warmup
  if (ratio < 1.5) {
    return [{ weight: barWeight, reps: 8, percent: Math.round((barWeight / workingWeight) * 100) }];
  }

  const steps = ratio < 3 ? [0.5, 0.75] : [0.4, 0.6, 0.8, 0.9];
  const reps = ratio < 3 ? [8, 4] : [8, 5, 3, 1];

  const sets: WarmupSet[] = [
    { weight: barWeight, reps: 10, percent: Math.round((barWeight / workingWeight) * 100) },
  ];

  for (let i = 0; i < steps.length; i++) {
    const raw = workingWeight * steps[i];
    // Round to something loadable rather than asking for 137.5 on a 5 lb gym
    const increment = unit === 'kg' ? 2.5 : 5;
    const weight = Math.max(barWeight, Math.round(raw / increment) * increment);
    // Skip a step that lands on the bar, or repeats the previous one
    if (weight <= sets[sets.length - 1].weight) continue;
    sets.push({ weight, reps: reps[i], percent: Math.round(steps[i] * 100) });
  }

  return sets;
};
