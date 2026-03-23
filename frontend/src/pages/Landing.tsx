import { Link, useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  const goToHowItWorks = () => {
    navigate('/how-it-works');
    window.scrollTo(0, 0);
  };

  return (
    <main className="bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 via-teal-800 to-gray-900 py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Train Smarter. Grow Stronger.
            </h1>
            <p className="text-lg sm:text-xl text-white max-w-2xl mb-3">
              The adaptive workout guide.
            </p>
            <p className="text-teal-200 max-w-2xl mb-8">
              Strength Guider prescribes your training with mathematical precision: optimal volume, weight targets, and planned recovery. It adapts after every workout based on your feedback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/login"
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                Get Started
              </Link>
              <button
                onClick={goToHowItWorks}
                className="border border-teal-400 text-teal-300 hover:bg-teal-900 font-bold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                Learn More
              </button>
            </div>
            <p className="text-teal-200 mt-4 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:text-teal-300 underline transition-colors">
                Log in
              </Link>
            </p>
          </div>
          <div className="flex-shrink-0">
            <img
              src="/workout_page.webp"
              alt="Strength Guider workout tracking screen"
              className="w-56 sm:w-64 rounded-2xl shadow-2xl"
              width={411}
              height={768}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* What Is Strength Guider */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          More Than a Workout Tracker
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <p className="text-gray-300 leading-relaxed mb-3">
              Most apps just log what you did. Strength Guider walks you through the best workout for your body, every session. It uses peer-reviewed models from exercise science to prescribe exactly how many sets each muscle group needs, how much weight to lift, and when to back off. With over 100 exercises and ready-made mesocycle templates, you can start training right away or build your own program from scratch.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Think of it as a knowledgeable training guide that leverages peer-reviewed modeling and your feedback instead of guesswork, at a fraction of the cost of a personal trainer. Along the way, you learn the science just by using the app.
            </p>
          </div>
          <div className="flex-shrink-0">
            <img
              src="/meso_page.webp"
              alt="Strength Guider mesocycle planning screen"
              className="w-56 sm:w-64 rounded-2xl shadow-2xl"
              width={661}
              height={768}
            />
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume Prescription */}
          <div
            onClick={() => navigate('/how-it-works#volume-model')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Personalized Volume</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              The algorithm computes the optimal number of sets per muscle group each week based on your individual response to training. Volume ramps progressively and includes a planned deload. No guessing required.
            </p>
          </div>

          {/* Full Workout Guidance */}
          <div
            onClick={() => navigate('/how-it-works#progressive-overload')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Complete Workout Guide</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Every session comes with target weights, rep ranges, and RIR (reps in reserve) goals. You know exactly what to do when you walk into the gym. Just follow the guide and log your sets.
            </p>
          </div>

          {/* Adaptive Feedback */}
          <div
            onClick={() => navigate('/how-it-works#volume-model')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Adapts to Your Feedback</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              After each workout, rate how each muscle group felt. Strength Guider adjusts future volume so sessions that felt too hard get dialed back, and muscles that can handle more get pushed.
            </p>
          </div>

          {/* Learn Exercise Science */}
          <div
            onClick={() => navigate('/how-it-works#mesocycles')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Learn Exercise Science as You Go</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Strength Guider introduces concepts like progressive overload, fatigue management, and periodization as you train. You learn to structure your training into mesocycles, the building blocks of a structured routine.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-800 border-t border-b border-gray-700 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <img
                src="/cal_page.webp"
                alt="Strength Guider mesocycle calendar view"
                className="w-48 sm:w-56 rounded-2xl shadow-2xl"
                width={376}
                height={768}
              />
            </div>
            <div className="flex-1 space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <h3 className="text-white font-medium">Create a Mesocycle</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Pick a template or build your own training block. Choose your days per week, total weeks, and assign exercises to each session.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">2</div>
                <div>
                  <h3 className="text-white font-medium">Get Your Prescription</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Strength Guider computes optimal sets per muscle group for each week, ramping volume progressively with a planned deload at the end.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
                <div>
                  <h3 className="text-white font-medium">Train and Log</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Follow your guided workouts with target weights, reps, and RIR. Log each set as you go and the app tracks everything.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
                <div>
                  <h3 className="text-white font-medium">Give Feedback, Get Better Plans</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Rate each muscle group after training. Your feedback adjusts future volume so every mesocycle is better than the last.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={goToHowItWorks} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Read the Full Theory
            </button>
          </div>
        </div>
      </section>

      {/* The Science */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Built on Exercise Science
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <p className="text-gray-300 leading-relaxed mb-3">
              Strength Guider is powered by the fitness-fatigue model <span className="text-teal-400">[1]</span>, a well-established framework from peer-reviewed research. Every training session produces two competing effects: long-lasting fitness gains and short-lived fatigue. Your performance is the balance between the two.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              The model extends this with variable fatigue sensitivity <span className="text-teal-400">[2]</span>, an adaptation threshold that forces progressive overload, and diminishing returns, capturing how real training works. Your personalized parameters mean the prescription fits you, not a generic template.
            </p>
            <div className="space-y-1">
              <p className="text-gray-400 text-xs leading-relaxed">
                <span className="text-teal-400 font-medium">[1]</span> Banister, E.W., Calvert, T.W., Savage, M.V., & Bach, T. (1975). A systems model of training for athletic performance. <em>Australian Journal of Sports Medicine</em>, 7, 57-61.
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                <span className="text-teal-400 font-medium">[2]</span> Busso, T. (2003). Variable dose-response relationship between exercise training and performance. <em>Medicine & Science in Sports & Exercise</em>, 35(7), 1188-1195.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-center">
            <img
              src="/lifter_page.webp"
              alt="Strength Guider lifter profile parameters"
              className="rounded-xl shadow-2xl mb-6 w-full max-w-md mx-auto border border-gray-600"
              width={768}
              height={509}
            />
            <p className="text-gray-400 text-sm mb-2">Optimum Volume Solution</p>
            <div className="text-teal-400 font-serif font-normal text-xl leading-relaxed">
              <div className="inline-flex items-center gap-2">
                <div className="inline-flex flex-col items-center">
                  <span className="px-1 pb-0.5"><em>d</em>(<em>&Delta;p</em>)</span>
                  <span className="border-t border-teal-400 w-full pt-0.5"><em>dw</em></span>
                </div>
                <span>=</span>
                <div className="inline-flex flex-col items-center">
                  <span className="px-1 pb-0.5"><em>k</em><sub className="text-sm">1</sub></span>
                  <span className="border-t border-teal-400 w-full pt-0.5"><em>w</em> &minus; <em>&alpha;</em> + 1</span>
                </div>
                <span>&minus;</span>
                <span><em>&kappa;</em></span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span><span className="text-teal-400 font-serif"><em>&Delta;p</em></span> performance</span>
              <span><span className="text-teal-400 font-serif"><em>w</em></span> weekly sets</span>
              <span><span className="text-teal-400 font-serif"><em>k</em><sub>1</sub></span> gain rate</span>
              <span><span className="text-teal-400 font-serif"><em>&alpha;</em></span> adaptation</span>
              <span><span className="text-teal-400 font-serif"><em>&kappa;</em></span> fatigue</span>
            </div>
          </div>
        </div>
      </section>

      {/* Use It Anywhere */}
      <section className="bg-gray-800 border-t border-b border-gray-700 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Use It Anywhere
          </h2>
          <p className="text-gray-300 text-center leading-relaxed max-w-2xl mx-auto mb-10">
            Strength Guider works in your browser on any device: phone, tablet, or computer. You can also install it as an app on your home screen for a full-screen, native-app experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Use the Website</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Just go to <span className="text-teal-400">strength-guider.com</span> on any browser. No download needed. Just sign in and start training.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Install as an App</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                On your phone, tap <span className="text-teal-400 inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4" /></svg>Share</span> and select <span className="text-teal-400 inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" /></svg>Add to Home Screen</span>. Strength Guider launches full-screen like a native app. No app store required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to Train?</h2>
        <Link
          to="/login"
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Get Started
        </Link>
        <p className="text-gray-500 mt-4 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-300 transition-colors">
            Log in
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8 px-4 text-center">
        <p className="text-gray-400 text-sm">
          Questions or feedback?{' '}
          <a href="mailto:strengthguider@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
            strengthguider@gmail.com
          </a>
        </p>
      </footer>
    </main>
  );
}
