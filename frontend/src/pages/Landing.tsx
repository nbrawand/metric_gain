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
            <p className="text-lg sm:text-xl text-teal-100 max-w-2xl mb-8">
              Science-backed volume prescription that adapts to you. Get the optimal number of sets per muscle group each week, personalized, progressive, and periodized.
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

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          Built on Exercise Science
        </h2>
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-gray-300 leading-relaxed mb-3 text-center">
            Strength Guider is powered by the <span className="text-white font-medium">fitness-fatigue model</span> <span className="text-teal-400">[1]</span>, a well-established framework from exercise science research. Every training session produces two competing effects: long-lasting fitness gains and short-lived fatigue. Your performance is the balance between the two.
          </p>
          <p className="text-gray-300 leading-relaxed text-center">
            The model extends this foundation with <span className="text-white font-medium">variable fatigue sensitivity</span> <span className="text-teal-400">[2]</span>, an adaptation threshold that forces progressive overload, and diminishing returns, capturing how real training works. Your personalized parameters mean the prescription fits <em>you</em>, not a generic template.
          </p>
        </div>

        {/* Equation + Variable Legend */}
        <div className="flex flex-col md:flex-row items-center gap-10 mb-12 px-4">
          {/* Equation */}
          <div className="flex-shrink-0 text-center">
            <div className="text-teal-400 font-serif font-normal text-3xl sm:text-4xl leading-relaxed">
              <div className="inline-flex items-center gap-4">
                <div className="inline-flex flex-col items-center">
                  <span className="px-2 pb-1"><em>d</em>(<em>&Delta;p</em>)</span>
                  <span className="border-t border-teal-400 w-full pt-1"><em>dw</em></span>
                </div>
                <span>=</span>
                <div className="inline-flex flex-col items-center">
                  <span className="px-2 pb-1"><em>k</em><sub className="text-xl">1</sub></span>
                  <span className="border-t border-teal-400 w-full pt-1"><em>w</em> &minus; <em>&alpha;</em> + 1</span>
                </div>
                <span>&minus;</span>
                <span><em>&kappa;</em></span>
              </div>
            </div>
            <p className="text-white text-lg mt-3">Strength Guider's Optimum Volume Solution</p>
          </div>

          {/* Variable Descriptions */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-lg">
            <div className="flex gap-3">
              <span className="text-teal-400 font-serif font-normal text-2xl w-10 flex-shrink-0 text-right"><em>&Delta;p</em></span>
              <span className="text-white">Performance change</span>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-serif font-normal text-2xl w-10 flex-shrink-0 text-right"><em>w</em></span>
              <span className="text-white">Weekly sets (volume)</span>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-serif font-normal text-2xl w-10 flex-shrink-0 text-right"><em>k</em><sub>1</sub></span>
              <span className="text-white">Fitness gain rate</span>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-serif font-normal text-2xl w-10 flex-shrink-0 text-right"><em>&alpha;</em></span>
              <span className="text-white">Adaptation threshold</span>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-serif font-normal text-2xl w-10 flex-shrink-0 text-right"><em>&kappa;</em></span>
              <span className="text-white">Fatigue sensitivity</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Built on the Banister <span className="text-teal-400">[1]</span> and Busso <span className="text-teal-400">[2]</span> fitness-fatigue models, our algorithm prescribes the optimal number of sets per muscle group based on your individual response to training.
            </p>
          </div>

          <div
            onClick={() => navigate('/how-it-works#progressive-overload')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Progressive Overload</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Automatic weight and rep targets that increase each week, with intensity managed through RIR progression across the mesocycle.
            </p>
          </div>

          <div
            onClick={() => navigate('/how-it-works#volume-model')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Adaptive Feedback</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              After each workout, your feedback tunes the model in real-time. Volume that felt too hard or too easy is adjusted for future sessions.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-1">
          <p className="text-gray-400 text-xs leading-relaxed">
            <span className="text-teal-400 font-medium">[1]</span> Banister, E.W., Calvert, T.W., Savage, M.V., & Bach, T. (1975). A systems model of training for athletic performance. <em>Australian Journal of Sports Medicine</em>, 7, 57–61.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            <span className="text-teal-400 font-medium">[2]</span> Busso, T. (2003). Variable dose-response relationship between exercise training and performance. <em>Medicine & Science in Sports & Exercise</em>, 35(7), 1188–1195.
          </p>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/how-it-works#volume-model')}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Read the Full Theory
          </button>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="bg-gray-800 border-t border-b border-gray-700 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            How It Works
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
              <div>
                <h3 className="text-white font-medium">Create a Mesocycle</h3>
                <p className="text-gray-400 text-sm">Design your training block: start from a pre-built template or build your own from scratch. Choose days per week, total weeks, and assign exercises to each session.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">2</div>
              <div>
                <h3 className="text-white font-medium">Get Your Volume Prescription</h3>
                <p className="text-gray-400 text-sm">The algorithm computes optimal sets per muscle group for each week, ramping volume with a planned deload.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <h3 className="text-white font-medium">Train and Log</h3>
                <p className="text-gray-400 text-sm">Work through each session with target weights and reps. The app tracks your progress and suggests weekly increases.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">4</div>
              <div>
                <h3 className="text-white font-medium">Give Feedback, Get Better Plans</h3>
                <p className="text-gray-400 text-sm">Rate each muscle group after training. Your feedback adjusts future volume so every session is dialed in.</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={goToHowItWorks} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to Start?</h2>
        <p className="text-gray-400 mb-8">Create your free account and build your first mesocycle.</p>
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
