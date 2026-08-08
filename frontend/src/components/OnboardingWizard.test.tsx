import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OnboardingWizard from './OnboardingWizard';

const renderWizard = () => {
  const onComplete = vi.fn();
  render(<OnboardingWizard onComplete={onComplete} />);
  return onComplete;
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

const allText = () => document.body.textContent ?? '';

const stepTexts = (): string[] => {
  const steps = [allText()];
  while (screen.queryByRole('button', { name: 'Next' })) {
    next();
    steps.push(allText());
  }
  return steps;
};

const textAcrossSteps = () => stepTexts().join('\n');

describe('walkthrough volume copy', () => {
  // The walkthrough used to teach only the manual model, telling new users to
  // pick a weekly increase and that the plan then sticks for the whole block.
  // Autoregulation is the default, so that was wrong for the default path.
  it('describes performance-based sets as the default', () => {
    renderWizard();
    const text = textAcrossSteps();
    expect(text).toMatch(/performance-based sets are the default/i);
  });

  it('describes what performance actually does to volume', () => {
    renderWizard();
    const text = textAcrossSteps();
    expect(text).toMatch(/one more set next week/i);
    expect(text).toMatch(/miss most and it drops a set/i);
    expect(text).toMatch(/capped per muscle group/i);
  });

  it('still offers the fixed weekly increase as the override', () => {
    renderWizard();
    const text = textAcrossSteps();
    expect(text).toMatch(/fixed weekly increase/i);
  });

  it('only calls the plan fixed where it is describing the manual mode', () => {
    renderWizard();
    // A blanket "the plan sticks for the whole mesocycle" is what made the old
    // copy wrong, so every claim of that has to sit with the fixed increase
    const claiming = stepTexts().filter((t) => /sticks for the whole mesocycle/i.test(t));
    expect(claiming.length).toBeGreaterThan(0);
    claiming.forEach((t) => expect(t).toMatch(/fixed weekly increase/i));
  });
});

describe('walkthrough navigation', () => {
  it('completes on the last step', () => {
    const onComplete = renderWizard();
    while (screen.queryByRole('button', { name: 'Next' })) next();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onComplete).toHaveBeenCalled();
  });
});
