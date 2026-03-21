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
                to="/register"
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
              src="/workout_page.png"
              alt="Strength Guider workout tracking screen"
              className="w-56 sm:w-64 rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Everything You Need to Optimize Your Training
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Personalized Volume</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              A mathematical model prescribes the optimal number of sets per muscle group based on your individual response to training.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
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

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
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

      {/* Science Section */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-teal-400 mb-3">Built on Exercise Science</h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            Strength Guider is powered by the <span className="text-white font-medium">fitness-fatigue model</span>, a well-established framework from exercise science research. Every training session produces two competing effects: long-lasting fitness gains and short-lived fatigue. Your performance is the balance between the two.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            The model extends this foundation with variable fatigue sensitivity, an adaptation threshold that forces progressive overload, and diminishing returns, capturing how real training works. Your personalized parameters mean the prescription fits <em>you</em>, not a generic template.
          </p>
          <button
            onClick={() => navigate('/how-it-works#volume-model')}
            className="text-teal-400 hover:text-teal-300 font-medium text-sm transition-colors"
          >
            Read the full theory &rarr;
          </button>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-800 border-t border-gray-700 py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to Start?</h2>
        <p className="text-gray-400 mb-8">Create your free account and build your first mesocycle in minutes.</p>
        <Link
          to="/register"
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
    </main>
  );
}
