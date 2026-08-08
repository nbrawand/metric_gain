import { useState } from 'react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Strength Guider',
      content: (
        <>
          <p className="text-gray-300 leading-relaxed mb-3">
            Strength Guider is an evidence-based hypertrophy training app that helps
            you build muscle more effectively by putting your training volume,
            intensity, and progression on a structured plan.
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
            structured training block, typically 3-12 weeks long, where each week
            builds on the previous one through gradual increases in volume and
            intensity.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            Training in structured blocks helps balance stimulus with recovery,
            reducing the risk of doing too little to see progress or too much to
            recover from.
          </p>
          <p className="text-gray-300 leading-relaxed">
            You decide the shape of each block: pick a starting set count for
            every exercise when you create your mesocycle, then choose how the
            volume grows from there when you start it.
          </p>
        </>
      ),
    },
    {
      title: 'Volume & RIR',
      content: (
        <>
          <p className="text-gray-300 leading-relaxed mb-3">
            For each exercise you choose a{' '}
            <span className="text-teal-400 font-medium">starting set count</span>.
            Before confirming, you review per-muscle-group charts of your planned
            weekly volume, so you can see what a week actually asks of each muscle
            before you train it.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            Intensity is managed through{' '}
            <span className="text-teal-400 font-medium">RIR (Reps In Reserve)</span>,
            the number of reps you could have done before failure. Week 1 targets
            3 RIR (moderate effort), decreasing each week until 0 RIR (failure)
            in the final week.
          </p>
          <p className="text-gray-300 leading-relaxed">
            During a workout you can add or remove sets on the spot, future
            sessions stay on your plan.
          </p>
        </>
      ),
    },
    {
      title: 'How Your Volume Grows',
      content: (
        <>
          <p className="text-gray-300 leading-relaxed mb-3">
            When you start a block you pick how your set counts change week to
            week. There are two ways, and you choose per block.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            <span className="text-teal-400 font-medium">Performance-based sets</span>{' '}
            are the default. Hit every target in a session and that exercise gets
            one more set next week; miss one and it holds; miss most and it drops
            a set. Volume is capped per muscle group so it cannot climb past what
            you can recover from. This reads the sets you already logged, so it
            costs you no extra taps and no questionnaires.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Prefer to drive it yourself? Turn that off and set a{' '}
            <span className="text-teal-400 font-medium">fixed weekly increase</span>{' '}
            for each exercise instead. That plan is decided up front and sticks
            for the whole mesocycle, whatever you log.
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
                create a template, choose your training days, weeks, exercises
                and starting sets.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                2
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Click <span className="text-teal-400 font-medium">Start Mesocycle</span> to
                begin your training block. This is where you pick performance-based
                sets or a fixed weekly increase, and the app generates your full
                schedule.
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

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      {/* Scrolls rather than clipping: the longest step outgrows a short phone
          screen, and without this the Next button goes off the bottom edge. */}
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90dvh] overflow-y-auto">
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
              onClick={() => onComplete()}
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
