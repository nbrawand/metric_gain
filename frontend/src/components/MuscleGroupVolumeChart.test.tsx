import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MuscleGroupVolumeChart from './MuscleGroupVolumeChart';

describe('MuscleGroupVolumeChart', () => {
  it('names the group and its weekly ceiling', () => {
    render(<MuscleGroupVolumeChart muscleGroup="Chest" weeklySets={[8, 10, 12]} />);

    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('cap ~22/wk')).toBeInTheDocument();
  });

  it('shows the set count for every week', () => {
    render(<MuscleGroupVolumeChart muscleGroup="Chest" weeklySets={[8, 10, 12]} />);

    for (const sets of ['8', '10', '12']) {
      expect(screen.getByText(sets)).toBeInTheDocument();
    }
    expect(screen.getByText('W1')).toBeInTheDocument();
    expect(screen.getByText('W3')).toBeInTheDocument();
  });

  it('marks the weeks that pass the ceiling', () => {
    // Chest tops out at 22, so weeks 2 and 3 are over
    const { container } = render(
      <MuscleGroupVolumeChart muscleGroup="Chest" weeklySets={[15, 25, 35]} />
    );

    const overBars = container.querySelectorAll('.bg-amber-500');
    const okBars = container.querySelectorAll('.bg-teal-500');
    expect(overBars).toHaveLength(2);
    expect(okBars).toHaveLength(1);
  });

  it('leaves an ordinary plan entirely unmarked', () => {
    const { container } = render(
      <MuscleGroupVolumeChart muscleGroup="Chest" weeklySets={[8, 10, 12]} />
    );

    expect(container.querySelectorAll('.bg-amber-500')).toHaveLength(0);
  });

  it('draws the ceiling even when no week reaches it', () => {
    /**
     * Scaling bars to their own maximum would make any plan look like it fills
     * the chart. The ceiling has to stay on screen to be the reference.
     */
    const { container } = render(
      <MuscleGroupVolumeChart muscleGroup="Chest" weeklySets={[2, 3]} />
    );

    const line = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(line).toBeInTheDocument();
    // 22 of a 22 max, so the line sits at the top rather than off-chart
    expect(line.style.bottom).toBe('100%');
  });

  it('falls back to a default ceiling for an unknown group', () => {
    render(<MuscleGroupVolumeChart muscleGroup="Grip" weeklySets={[5]} />);
    expect(screen.getByText('cap ~25/wk')).toBeInTheDocument();
  });
});
