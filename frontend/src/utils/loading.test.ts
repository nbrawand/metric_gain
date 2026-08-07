import { describe, expect, it } from 'vitest';
import { BAR_WEIGHT, computePlateLoading, computeWarmupSets } from './loading';

describe('computePlateLoading', () => {
  it('loads a familiar barbell weight', () => {
    // 225 = 45 bar + 45+45 a side
    const { perSide, shortfall } = computePlateLoading(225, 'lb');
    expect(perSide).toEqual([{ plate: 45, count: 2 }]);
    expect(shortfall).toBe(0);
  });

  it('works down through the plate sizes', () => {
    // 137.5 = 45 bar + (45 + 2.5) a side
    const { perSide, shortfall } = computePlateLoading(140, 'lb');
    expect(perSide).toEqual([
      { plate: 45, count: 1 },
      { plate: 2.5, count: 1 },
    ]);
    expect(shortfall).toBe(0);
  });

  it('uses metric plates in kilograms', () => {
    // 100 = 20 bar + (25 + 15) a side
    const { perSide, shortfall } = computePlateLoading(100, 'kg');
    expect(perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(shortfall).toBe(0);
  });

  it('reports what it cannot reach rather than lying', () => {
    // 226 is not loadable on 2.5 lb plates; the honest answer is 225 and 1 short
    const { achievable, shortfall } = computePlateLoading(226, 'lb');
    expect(achievable).toBe(225);
    expect(shortfall).toBe(1);
  });

  it('says so when the target is below the bar', () => {
    // Dumbbells, machines and cable work all land here
    const result = computePlateLoading(30, 'lb');
    expect(result.belowBar).toBe(true);
    expect(result.perSide).toEqual([]);
  });

  it('handles the empty bar exactly', () => {
    const result = computePlateLoading(BAR_WEIGHT.lb, 'lb');
    expect(result.belowBar).toBe(false);
    expect(result.perSide).toEqual([]);
    expect(result.shortfall).toBe(0);
  });

  it('returns nothing for a missing or nonsense target', () => {
    for (const target of [0, -50, NaN]) {
      expect(computePlateLoading(target, 'lb').perSide).toEqual([]);
    }
  });

  it('carries no floating point dust', () => {
    // 137.5 needs a 1.25 per side, which pound gyms do not stock, so the
    // honest answer is 135 and 2.5 short, exactly 2.5, not 2.4999999996
    const { achievable, shortfall } = computePlateLoading(137.5, 'lb');
    expect(achievable).toBe(135);
    expect(shortfall).toBe(2.5);

    // And a weight that IS loadable comes out clean
    expect(computePlateLoading(142.5, 'kg', 20).shortfall).toBe(0);
  });
});

describe('computeWarmupSets', () => {
  it('always starts with the empty bar', () => {
    const sets = computeWarmupSets(225, 'lb');
    expect(sets[0].weight).toBe(BAR_WEIGHT.lb);
  });

  it('ramps up to but never past the working weight', () => {
    const sets = computeWarmupSets(225, 'lb');
    expect(sets.every((s) => s.weight < 225)).toBe(true);
    // Ascending
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i].weight).toBeGreaterThan(sets[i - 1].weight);
    }
  });

  it('drops the reps as the weight climbs', () => {
    const sets = computeWarmupSets(315, 'lb');
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i].reps).toBeLessThanOrEqual(sets[i - 1].reps);
    }
  });

  it('gives a light working weight one easy set, not four', () => {
    // Warming up to 65 lb in four stages wastes the session
    const sets = computeWarmupSets(65, 'lb');
    expect(sets).toHaveLength(1);
    expect(sets[0].weight).toBe(BAR_WEIGHT.lb);
  });

  it('gives a heavy working weight a full ramp', () => {
    expect(computeWarmupSets(405, 'lb').length).toBeGreaterThanOrEqual(4);
  });

  it('rounds to weights the gym can actually load', () => {
    for (const set of computeWarmupSets(227.5, 'lb')) {
      expect(set.weight % 5).toBe(0);
    }
    for (const set of computeWarmupSets(102.5, 'kg')) {
      expect(set.weight % 2.5).toBe(0);
    }
  });

  it('uses the metric bar in kilograms', () => {
    expect(computeWarmupSets(140, 'kg')[0].weight).toBe(BAR_WEIGHT.kg);
  });

  it('returns nothing for a missing working weight', () => {
    for (const weight of [0, -10, NaN]) {
      expect(computeWarmupSets(weight, 'lb')).toEqual([]);
    }
  });
});
