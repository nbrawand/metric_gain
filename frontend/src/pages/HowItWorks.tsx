/**
 * How It Works page - explains the theory and usage of Strength Guider
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function HowItWorks() {
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // getElementById rather than querySelector: a fragment that is not a
      // valid CSS selector (from a tracking link, say) threw and blanked the page
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">How It Works</h1>
        <p className="text-gray-400">An overview of how to use Strength Guider and the principles behind it</p>
      </div>

      {/* How to Use the App */}
      <section id="getting-started" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Getting Started</h2>

        <div className="space-y-5">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
            <div>
              <h3 className="text-white font-medium mb-1">Create a Mesocycle Template</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Go to the Mesocycles page and create a template. Choose how many days per week you would like to train and how many weeks the block will last, then assign exercises to each training day. For each exercise, set a starting set count and the weekly increase. Before confirming, review bar charts of your planned weekly volume per muscle group. You can start from a pre-built template or create your own.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">2</div>
            <div>
              <h3 className="text-white font-medium mb-1">Start a Mesocycle</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Once your template is ready, start a mesocycle from it to generate your training schedule. Every session is created up front, including an extra deload week at the end. By default set counts adjust each week from what you actually log; you can switch that off to follow your template's fixed weekly increase instead.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
            <div>
              <h3 className="text-white font-medium mb-1">Train and Log Your Workouts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Work through your mesocycle session by session, recording the weight and reps for each set. The app provides target recommendations based on your previous performance, including a load increase sized to the smallest step that exercise can actually be loaded with, and an RIR target that decreases as the weeks progress. Weights only go up when the previous session hit its targets.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
            <div>
              <h3 className="text-white font-medium mb-1">Adjust on the Fly</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                During a workout you can add or remove sets, swap exercises, or add new ones. Adding, removing or swapping an exercise carries into the same day in every later week of the block, since that is nearly always a decision about the block rather than about today. Weeks you have already completed are never rewritten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progressive Overload */}
      <section id="progressive-overload" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Progressive Overload</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Progressive overload is a core principle of strength training. It refers to gradually increasing the demands placed on your muscles over time so that they continue to adapt. This can be done by increasing the weight lifted, performing more repetitions at a given weight, or adding more sets.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Strength Guider tracks these variables and suggests small, incremental increases each week. Progressive overload is applied through mesocycles: structured training blocks that increase demands week over week, peaking in the final training week and then unloading in a deload week.
        </p>
      </section>

      {/* Mesocycles */}
      <section id="mesocycles" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">What Is a Mesocycle?</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          A mesocycle is a training block, typically three to twelve weeks long, where each week builds on the previous one through gradual increases in weight, repetitions, or volume.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Training in structured blocks helps ensure that each session has a clear purpose. It also helps balance training stimulus with recovery, reducing the risk of doing too little to see progress or too much to recover from.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Intensity also progresses across the mesocycle through RIR (Reps In Reserve) targets. Week one begins at 3 RIR, a moderate effort level that allows for technique focus and volume accumulation. Each week the target steps down toward 0 RIR (failure) in the final training week. In longer blocks the same RIR carries across two weeks, since the ramp is spread evenly over however many weeks you chose. The deload week that follows sits above the ramp at 4 RIR, well short of failure.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Volume progresses from your own results. Each exercise starts at the set count you chose. Hit every target in a session and that exercise gets one more set next week; miss one and it holds; miss most of them and it drops a set. Increases stop at a recoverable weekly total for each muscle group, since recovery happens per muscle rather than per exercise. If you would rather drive it yourself, turn performance-based sets off when you start a block and your template's fixed weekly increase is used instead.
        </p>
      </section>

      {/* Offline */}
      <section id="offline" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Training Without Signal</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Gyms are full of basements and car parks. Strength Guider keeps working with no
          connection at all: your whole block is created up front, so every session and
          every target is already on the device before you get there.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Log sets exactly as normal. Anything that cannot reach the server is queued on
          the device and sent the moment you are back online, so nothing you record is
          waiting on a network you do not have. A banner tells you when the server is
          unreachable, rather than letting you guess.
        </p>
      </section>

      {/* Progress */}
      <section id="progress" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Seeing Your Progress</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          The <span className="text-white font-medium">Progress</span> page reads back
          everything you have logged: estimated one-rep max per exercise over time, hard
          sets per muscle group each week, and your best lifts.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Strength estimates count the reps you left in reserve, not just the reps you
          performed. A set stopped at 2 RIR had two more in it, and treating it as a
          maximum would make a deliberately submaximal session look like a step backwards.
        </p>
      </section>

      {/* Rest */}
      <section id="rest" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Resting Between Sets</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Rest until you feel ready to give the next set full effort, usually two to four
          minutes for big lifts and one to two for smaller ones. That judgement is better
          than a fixed number, so it is what the app defaults to.
        </p>
        <p className="text-gray-300 leading-relaxed">
          If you would rather have a countdown, turn the rest timer on from the menu and
          pick a duration. It starts each time you save a set and can be restarted or
          dismissed. Leave it off and nothing changes.
        </p>
      </section>

      {/* Deload */}
      <section id="deload" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">The Deload Week</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Every block runs one extra week after the training weeks you planned. A block
          that ended on its hardest week would hand the next block a fully fatigued
          lifter, and fatigue carried forward is fatigue you train through rather than
          adapt to.
        </p>
        <p className="text-gray-300 leading-relaxed">
          The deload keeps the same exercises at about half the sets, roughly ten percent
          lighter, at a 4 RIR target. It is meant to feel easy. A six-week block therefore
          schedules seven weeks of sessions, and the block is complete once the deload is
          done.
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
          <p><span className="text-teal-400 font-medium">3 RIR</span>: You had three reps left. The set felt moderate.</p>
          <p><span className="text-teal-400 font-medium">2 RIR</span>: You had two reps left. The set was challenging but controlled.</p>
          <p><span className="text-teal-400 font-medium">1 RIR</span>: You had one rep left. The set was very hard, close to your limit.</p>
          <p><span className="text-teal-400 font-medium">0 RIR</span>: You could not have completed another rep. This is failure.</p>
        </div>
        <p className="text-gray-300 leading-relaxed mt-3">
          Strength Guider uses RIR to manage intensity across each mesocycle. Earlier weeks use higher RIR targets to allow for volume accumulation, while later weeks lower the target to increase intensity.
        </p>
      </section>

      {/* Volume Planning */}
      <section id="volume-model" className="bg-gray-800 rounded-lg p-6 scroll-mt-16">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Planning Your Volume</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          When creating a mesocycle, each exercise gets a <span className="text-white font-medium">starting set count</span> for week one. Before confirming, you review bar charts of the total weekly sets for each muscle group, with a warning if any group runs past what most lifters recover from.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          From there, volume follows your results rather than a formula:
        </p>
        <div className="bg-gray-700 rounded-lg p-4 mb-3 text-sm space-y-1">
          <p className="text-gray-300"><span className="text-teal-400">every set hit its target</span>: one more set next week</p>
          <p className="text-gray-300"><span className="text-teal-400">one set missed</span>: hold at the same number</p>
          <p className="text-gray-300"><span className="text-teal-400">most sets missed</span>: one fewer set next week</p>
        </div>
        <p className="text-gray-300 leading-relaxed mb-3">
          Increases stop at a recoverable weekly total for each muscle group. Recovery happens per muscle, not per exercise: three chest movements each creeping up by one set is nine extra chest sets a week, which no per-exercise limit would notice.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Prefer to drive it yourself? Turn off <span className="text-white font-medium">Adjust sets from my performance</span> when you start a block, and it follows the fixed weekly increase from your template instead, which is <span className="font-mono text-xs">round(starting sets + weekly increase × (N − 1))</span>, minimum 1. Half-set increases are allowed, so 0.5 with 3 starting sets gives 3, 4, 4, 5, 5, 6 across six weeks.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Adding, removing or swapping an exercise mid-workout carries into the same day in every later week of the block, since that is nearly always a decision about the block rather than about today. Weeks you have already completed are never rewritten.
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

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-8 py-8 px-4 text-center">
        <p className="text-gray-500 text-xs">&copy; 2026 Strength Guider. All rights reserved.</p>
      </footer>
    </main>
  );
}
