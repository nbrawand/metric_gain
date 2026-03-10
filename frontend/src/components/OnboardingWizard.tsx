import { useState } from 'react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    title: 'Welcome to Strength Guider',
    content: (
      <>
        <p className="text-gray-300 leading-relaxed mb-3">
          Strength Guider is an evidence-based hypertrophy training app that helps
          you build muscle more effectively by managing your training volume,
          intensity, and progression.
        </p>
        <p className="text-gray-300 leading-relaxed">
          This quick walkthrough will explain the core concepts so you can get
          started right away.
        </p>
      </>
    ),
  },
  {
    title: 'Mesocycles',
    content: (
      <>
        <p className="text-gray-300 leading-relaxed mb-3">
          A <span className="text-teal-400 font-medium">mesocycle</span> is a
          structured training block, typically 3-7 weeks long, where each week
          builds on the previous one through gradual increases in volume and
          intensity.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Training in structured blocks helps balance stimulus with recovery,
          reducing the risk of doing too little to see progress or too much to
          recover from.
        </p>
        <p className="text-gray-300 leading-relaxed">
          The final week of each mesocycle is a <span className="text-teal-400 font-medium">deload</span> —
          volume and intensity are reduced so your body can recover before the
          next block.
        </p>
      </>
    ),
  },
  {
    title: 'Volume & RIR',
    content: (
      <>
        <p className="text-gray-300 leading-relaxed mb-3">
          The app auto-prescribes <span className="text-teal-400 font-medium">how many sets</span> you
          should perform per muscle group each session, increasing volume week
          over week across the mesocycle.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Intensity is managed through{' '}
          <span className="text-teal-400 font-medium">RIR (Reps In Reserve)</span> —
          the number of reps you could have done before failure. Week 1 targets
          3 RIR (moderate effort), decreasing each week until 0 RIR (failure)
          in the final training week.
        </p>
        <p className="text-gray-300 leading-relaxed">
          After each session, you rate how each muscle group felt. This
          feedback, combined with your logged performance, informs future
          adjustments.
        </p>
      </>
    ),
  },
  {
    title: 'Get Started',
    content: (
      <>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
              1
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Go to <span className="text-teal-400 font-medium">Mesocycles</span> and
              create a template — choose your training days, weeks, and exercises.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
              2
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Click <span className="text-teal-400 font-medium">Start Instance</span> to
              begin your training block. The app will generate your schedule with
              prescribed sets.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
              3
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Return to the Home page and click{' '}
              <span className="text-teal-400 font-medium">Continue Mesocycle</span> to
              log each workout session.
            </p>
          </div>
        </div>
      </>
    ),
  },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          {steps[step].title}
        </h2>

        {/* Content */}
        <div className="mb-6 min-h-[160px]">{steps[step].content}</div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-teal-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-between">
          {isFirst ? (
            <button
              onClick={onComplete}
              className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={() => setStep(step - 1)}
              className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Back
            </button>
          )}

          <button
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
