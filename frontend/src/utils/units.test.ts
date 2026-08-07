import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REST_TIMER,
  restTimerFromPreferences,
  weightUnitFromPreferences,
  weightUnitLabel,
} from './units';

describe('weightUnitFromPreferences', () => {
  it('reads the stored unit', () => {
    expect(weightUnitFromPreferences(JSON.stringify({ weight_unit: 'kg' }))).toBe('kg');
    expect(weightUnitFromPreferences(JSON.stringify({ weight_unit: 'lb' }))).toBe('lb');
  });

  it('defaults to pounds for anything missing or unparseable', () => {
    // preferences is a free-text JSON column, so it can be anything
    expect(weightUnitFromPreferences(null)).toBe('lb');
    expect(weightUnitFromPreferences(undefined)).toBe('lb');
    expect(weightUnitFromPreferences('')).toBe('lb');
    expect(weightUnitFromPreferences('{}')).toBe('lb');
    expect(weightUnitFromPreferences('not json')).toBe('lb');
    expect(weightUnitFromPreferences(JSON.stringify({ weight_unit: 'stone' }))).toBe('lb');
  });
});

describe('weightUnitLabel', () => {
  it('reads naturally in prose', () => {
    expect(weightUnitLabel('lb')).toBe('lbs');
    // kg is already both singular and plural
    expect(weightUnitLabel('kg')).toBe('kg');
  });
});

describe('restTimerFromPreferences', () => {
  it('is off unless explicitly turned on', () => {
    expect(restTimerFromPreferences(null)).toEqual(DEFAULT_REST_TIMER);
    expect(restTimerFromPreferences('{}').enabled).toBe(false);
    // Only a real boolean true counts, not a truthy value
    expect(restTimerFromPreferences(JSON.stringify({ rest_timer_enabled: 'yes' })).enabled).toBe(false);
  });

  it('reads an enabled timer and its duration', () => {
    const pref = restTimerFromPreferences(
      JSON.stringify({ rest_timer_enabled: true, rest_timer_seconds: 90 })
    );
    expect(pref).toEqual({ enabled: true, seconds: 90 });
  });

  it('falls back to a sane duration for a broken one', () => {
    for (const seconds of [0, -30, 'abc', null]) {
      const pref = restTimerFromPreferences(
        JSON.stringify({ rest_timer_enabled: true, rest_timer_seconds: seconds })
      );
      expect(pref.seconds).toBe(DEFAULT_REST_TIMER.seconds);
    }
  });

  it('survives unparseable preferences', () => {
    expect(restTimerFromPreferences('not json')).toEqual(DEFAULT_REST_TIMER);
  });
});
