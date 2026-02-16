/**
 * How It Works page - explains the theory and usage of Metric Gain
 */

import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">How It Works</h1>
        <p className="text-gray-400">The science-backed approach behind Metric Gain</p>
      </div>

      {/* How to Use the App */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Using Metric Gain</h2>

        <div className="space-y-5">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
            <div>
              <h3 className="text-white font-medium mb-1">Create a Mesocycle Template</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Go to the Mesocycles page and create a template. Choose how many days per week you want to train and how many weeks the block will last. For each training day, select the exercises you want to perform. You can use an existing template or build your own from scratch.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">2</div>
            <div>
              <h3 className="text-white font-medium mb-1">Start an Instance</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Once your template is ready, start a mesocycle instance. This creates your personalized training schedule. The app generates workouts for each day of each week with the appropriate number of sets based on the muscle groups trained and the current week of the mesocycle.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
            <div>
              <h3 className="text-white font-medium mb-1">Train and Log Your Workouts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Progress through your mesocycle day by day. For each exercise, log the weight and reps you performed. The app provides target recommendations based on your previous performance, including a small weekly weight increase of 2.5 percent or at least 2.5 pounds and a target RIR (Reps In Reserve) that decreases as the weeks progress, gradually pushing you closer to your limits.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
            <div>
              <h3 className="text-white font-medium mb-1">Give Feedback After Each Workout</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                After completing a workout, the app asks how each muscle group felt: Easy, Just Right, Difficult, or Too Difficult. This feedback helps you reflect on your training and informs adjustments for your next mesocycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progressive Overload */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Progressive Overload</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Progressive overload is the foundational principle of strength training. It involves gradually increasing the demands placed on your muscles over time so they continue to adapt and grow. Without progressive overload, your body has no reason to get stronger.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          This can be achieved by increasing the weight you lift, performing more reps at the same weight, or adding more sets. Metric Gain tracks all three and suggests small, incremental increases each week so progress remains consistent and sustainable.
        </p>
        <p className="text-gray-300 leading-relaxed">
          In Metric Gain, progressive overload is implemented through mesocycles, which are structured training blocks that systematically increase demands week over week.
        </p>
      </section>

      {/* Mesocycles */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is a Mesocycle?</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          A mesocycle is a structured training block, typically lasting three to seven weeks, designed to progressively challenge your body before allowing it to recover. Each week builds on the last with small increases in weight, reps, or overall training volume.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          By training in mesocycles rather than improvising workouts, every session has a clear purpose. This structure helps prevent undertraining, where the stimulus is too small to drive growth, and overtraining, where recovery cannot keep up with the workload.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Training intensity also progresses across the mesocycle through RIR (Reps In Reserve). Week one begins at 3 RIR, which is a comfortable effort level that allows you to focus on technique and accumulate volume. Each week, the target RIR decreases, and by the final training week before the deload, you are pushing to 0 RIR, or failure. This gradual increase in intensity ensures sufficient stimulus for growth while managing fatigue.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          The final week of every mesocycle is a deload week. During a deload, both volume and intensity are significantly reduced, allowing your muscles, joints, and nervous system to recover from accumulated fatigue. This is not a week off. You still train, but with fewer sets and lighter weights. The goal is to allow recovery to catch up so the strength and muscle gained during the block can fully express themselves.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Without deloads, fatigue continues to accumulate until performance stalls or injury becomes more likely. By building recovery directly into the plan, each mesocycle ends with you feeling refreshed and ready to train harder in the next one.
        </p>
      </section>

      {/* RIR */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is RIR (Reps In Reserve)?</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          RIR stands for Reps In Reserve and refers to the number of additional repetitions you could have performed before reaching failure. It provides a way to gauge training intensity without requiring you to train to failure on every set.
        </p>
        <div className="bg-gray-700 rounded-lg p-4 mb-3">
          <p className="text-white font-medium mb-2">Example</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            You perform a set of bench press at 135 pounds and complete 10 reps. If you believe you could have performed two additional reps before failing, that set was performed at <span className="text-teal-400 font-medium">2 RIR</span>.
          </p>
        </div>
        <div className="space-y-2 text-sm text-gray-300">
          <p><span className="text-teal-400 font-medium">3 RIR</span> — You had three reps left in reserve. The set felt moderate.</p>
          <p><span className="text-teal-400 font-medium">2 RIR</span> — You had two reps left. The set was challenging but controlled.</p>
          <p><span className="text-teal-400 font-medium">1 RIR</span> — You had one rep left. The set was very hard and near your limit.</p>
          <p><span className="text-teal-400 font-medium">0 RIR</span> — You could not have completed another rep. This is failure.</p>
        </div>
        <p className="text-gray-300 leading-relaxed mt-3">
          Metric Gain uses RIR to manage training intensity across each mesocycle. Early weeks use higher RIR targets to allow volume accumulation, while the RIR decreases each week to increase intensity as the block progresses. The deload week uses a very high RIR target of 8 to allow full recovery.
        </p>
      </section>

      {/* CTA */}
      <div className="text-center pt-2 pb-4">
        <button
          onClick={() => navigate('/mesocycles')}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
