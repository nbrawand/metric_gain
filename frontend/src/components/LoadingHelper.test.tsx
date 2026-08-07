import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoadingHelper from './LoadingHelper';

const open = (weight: number, unit: 'lb' | 'kg' = 'lb', onClose = vi.fn()) => {
  render(
    <LoadingHelper
      weight={weight}
      unit={unit}
      exerciseName="Barbell Squat"
      onClose={onClose}
    />
  );
  return onClose;
};

describe('LoadingHelper', () => {
  it('shows the plates for one side of the bar', () => {
    open(225);
    // The weight appears twice: as the heading and as the working set
    expect(screen.getByRole('heading', { name: '225 lbs' })).toBeInTheDocument();
    expect(screen.getByText('Each side of the bar')).toBeInTheDocument();
    expect(screen.getByText('2 × 45')).toBeInTheDocument();
  });

  it('says when a weight is below the bar rather than showing no plates', () => {
    // Dumbbell and machine targets land here constantly
    open(30);
    expect(screen.getByText(/below the 45 lbs bar/i)).toBeInTheDocument();
  });

  it('admits when no plate combination hits the target', () => {
    // 137.5 needs a 1.25 per side, which pound gyms do not stock
    open(137.5);
    expect(screen.getByText(/closest is 135 lbs/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.5 lbs short/i)).toBeInTheDocument();
  });

  it('says nothing about a shortfall when the weight is exact', () => {
    open(225);
    expect(screen.queryByText(/short/i)).not.toBeInTheDocument();
  });

  it('lists a warmup ramp ending at the working set', () => {
    open(225);
    expect(screen.getByText('Working up')).toBeInTheDocument();
    expect(screen.getByText('working set')).toBeInTheDocument();
    // Always opens on the empty bar
    expect(screen.getByText('45 lbs')).toBeInTheDocument();
  });

  it('uses metric plates and the metric bar in kilograms', () => {
    open(100, 'kg');
    expect(screen.getByRole('heading', { name: '100 kg' })).toBeInTheDocument();
    // 20 kg bar + 25 + 15 a side
    expect(screen.getByText('1 × 25')).toBeInTheDocument();
    expect(screen.getByText('1 × 15')).toBeInTheDocument();
  });

  it('closes when asked', () => {
    const onClose = open(225);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('presents the ramp as guidance rather than prescription', () => {
    open(225);
    expect(screen.getByText(/a guide, not a prescription/i)).toBeInTheDocument();
  });
});
