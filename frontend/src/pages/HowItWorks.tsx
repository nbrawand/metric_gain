/**
 * How It Works page - explains the theory and usage of Strength Guider
 */

import { useNavigate } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">How It Works</h1>
        <p className="text-gray-400">An overview of how to use Strength Guider and the principles behind it</p>
      </div>

      {/* How to Use the App */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Getting Started</h2>

        <div className="space-y-5">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
            <div>
              <h3 className="text-white font-medium mb-1">Create a Mesocycle Template</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Go to the Mesocycles page and create a template. Choose how many days per week you would like to train and how many weeks the block will last, then assign exercises to each training day. You can start from a pre-built template or create your own.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">2</div>
            <div>
              <h3 className="text-white font-medium mb-1">Start an Instance</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Once your template is ready, start a mesocycle instance to generate your training schedule. The app will determine the number of sets per muscle group for each session, with volume increasing gradually across the block.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
            <div>
              <h3 className="text-white font-medium mb-1">Train and Log Your Workouts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Work through your mesocycle session by session, recording the weight and reps for each set. The app provides target recommendations based on your previous performance, including a small weekly load increase of 2.5% (minimum 2.5 lbs) and an RIR target that decreases as the weeks progress.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
            <div>
              <h3 className="text-white font-medium mb-1">Provide Feedback After Each Workout</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                After completing a session, you will be asked how each muscle group felt: Easy, Just Right, Difficult, or Too Difficult. This feedback, along with your logged performance, helps inform adjustments for future training blocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progressive Overload */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Progressive Overload</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Progressive overload is a core principle of strength training. It refers to gradually increasing the demands placed on your muscles over time so that they continue to adapt. This can be done by increasing the weight lifted, performing more repetitions at a given weight, or adding more sets.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Strength Guider tracks these variables and suggests small, incremental increases each week. Progressive overload is applied through mesocycles, which are structured training blocks that increase demands week over week before a planned recovery period.
        </p>
      </section>

      {/* Mesocycles */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is a Mesocycle?</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          A mesocycle is a training block, typically three to seven weeks long, where each week builds on the previous one through gradual increases in weight, repetitions, or volume.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Training in structured blocks helps ensure that each session has a clear purpose. It also helps balance training stimulus with recovery, reducing the risk of doing too little to see progress or too much to recover from.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Intensity also progresses across the mesocycle through RIR (Reps In Reserve) targets. Week one begins at 3 RIR, a moderate effort level that allows for technique focus and volume accumulation. Each subsequent week, the target RIR decreases, and by the final training week before the deload, the target reaches 0 RIR (failure).
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          The final week of each mesocycle is a deload week. During a deload, both volume and intensity are reduced. You still train, but with fewer sets and lighter weights. This allows your body to recover from the fatigue accumulated during the training block.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Periodic deloads help prevent performance plateaus and reduce injury risk. By including recovery in the program structure, each mesocycle can begin from a better starting point than the last.
        </p>
      </section>

      {/* RIR */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is RIR (Reps In Reserve)?</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          RIR stands for Reps In Reserve. It refers to the number of additional repetitions you could have completed before reaching failure on a given set. It is a way to gauge how hard a set was without needing to train to failure every time.
        </p>
        <div className="bg-gray-700 rounded-lg p-4 mb-3">
          <p className="text-white font-medium mb-2">Example</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            You complete a set of bench press at 135 lbs for 10 reps. If you could have done two more reps before failing, that set was at <span className="text-teal-400 font-medium">2 RIR</span>.
          </p>
        </div>
        <div className="space-y-2 text-sm text-gray-300">
          <p><span className="text-teal-400 font-medium">3 RIR</span> — You had three reps left. The set felt moderate.</p>
          <p><span className="text-teal-400 font-medium">2 RIR</span> — You had two reps left. The set was challenging but controlled.</p>
          <p><span className="text-teal-400 font-medium">1 RIR</span> — You had one rep left. The set was very hard, close to your limit.</p>
          <p><span className="text-teal-400 font-medium">0 RIR</span> — You could not have completed another rep. This is failure.</p>
        </div>
        <p className="text-gray-300 leading-relaxed mt-3">
          Strength Guider uses RIR to manage intensity across each mesocycle. Earlier weeks use higher RIR targets to allow for volume accumulation, while later weeks lower the target to increase intensity. The deload week uses an RIR target of 8 to support recovery.
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
