/**
 * How It Works page - explains the theory and usage of Metric Gain
 */

import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300 mb-3 inline-block"
          >
            &larr; Back to Home
          </button>
          <h1 className="text-2xl font-bold text-white">How It Works</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white mb-2">How It Works</h1>
          <p className="text-gray-400">The science-backed approach behind Metric Gain</p>
        </div>

        {/* Progressive Overload */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-teal-400 mb-3">Progressive Overload</h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            Progressive overload is the foundational principle of strength training. It means gradually increasing the demands placed on your muscles over time so they continue to adapt and grow. Without it, your body has no reason to get stronger.
          </p>
          <p className="text-gray-300 leading-relaxed">
            This can be achieved by increasing the weight you lift, performing more reps at the same weight, or adding more sets. Metric Gain tracks all three for you and suggests incremental increases each week so progress happens consistently and sustainably.
          </p>
        </section>

        {/* Mesocycles */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is a Mesocycle?</h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            A mesocycle is a structured training block, typically 3-7 weeks long, designed to push your body progressively harder before allowing it to recover. Each week within the mesocycle builds on the last with small increases in weight, reps, or volume.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            By training in mesocycles rather than just "winging it," you ensure that every workout has purpose. The structure prevents both under-training (doing too little to grow) and over-training (doing too much to recover from), keeping you in the sweet spot for progress.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            The final week of every mesocycle is a deload week. During a deload you reduce volume and intensity significantly, giving your muscles, joints, and nervous system a chance to fully recover from the accumulated fatigue of the training block. This is not a week off — you still train, but with fewer sets and lighter weights. The purpose is to let your body "catch up" on recovery so the strength and muscle you built can fully express itself.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Without deloads, fatigue accumulates week after week until performance stalls or injury occurs. By building recovery into the plan, you finish each mesocycle feeling refreshed and ready to push even harder in the next one.
          </p>
        </section>

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
                  Once your template is ready, start a mesocycle instance. This creates your personalized training schedule. The app generates workouts for each day of each week with the appropriate number of sets based on muscle group and week number.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <h3 className="text-white font-medium mb-1">Train and Log Your Workouts</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Progress through your mesocycle day by day. For each exercise, log the weight and reps you performed. The app shows you target recommendations based on your previous performance: a small weight increase each week (2.5% or at least 2.5 lbs) and a target RIR (Reps In Reserve) that decreases as the weeks progress, pushing you closer to your limits.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
              <div>
                <h3 className="text-white font-medium mb-1">Give Feedback After Each Workout</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  When you complete a workout, the app asks how each muscle group felt: Easy, Just Right, Difficult, or Too Difficult. This feedback helps you reflect on your training and make informed adjustments for your next mesocycle.
                </p>
              </div>
            </div>
          </div>
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
    </div>
  );
}
