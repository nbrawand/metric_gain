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
            {/* The positioning line. Our sets adapt from logged performance;
                the expensive competitor asks five subjective questions per
                muscle per session to approximate the same thing. */}
            <p className="text-lg sm:text-xl text-white max-w-2xl mb-3">
              It adapts from what you lifted, not from a survey.
            </p>
            <p className="text-teal-200 max-w-2xl mb-6">
              Strength Guider turns your training plan into guided workouts: it handles weight targets, RIR, and set counts that adjust from what you actually lift, and lays out every session for the whole block. No questionnaires, no guesswork, and it works in the gym with no signal at all.
            </p>

            {/* Price and trial belong here, not in the footer: both are the
                strongest cards against a competitor at $34.99/mo with no trial */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center md:justify-start mb-6">
              <span className="text-white text-2xl font-bold">$4.99<span className="text-base font-medium text-teal-200">/month</span></span>
              <span className="text-teal-100 text-sm bg-teal-900/60 border border-teal-500 rounded-full px-3 py-1">
                Free for 5 days, no card up front
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/login"
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                Start Free
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
                Sign in
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
              Most apps just log what you did. Strength Guider walks you through every session of a structured training block: it generates your full schedule with weight targets and RIR goals, then adjusts your sets each week from what you actually logged. With <span className="text-white font-medium">140 exercises</span> across 12 muscle groups and <span className="text-white font-medium">16 ready-made blocks</span>, you can start training today or build your own from scratch.
            </p>
            <p className="text-gray-300 leading-relaxed mb-3">
              Every block ends with a deload week. Weights only rise when you hit the last session's targets, and they move in steps your gym can actually load, in pounds or kilograms. Tap any target for the plates and a warmup ramp, and see your estimated strength, weekly volume and best lifts on the Progress page.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Think of it as a knowledgeable training guide that keeps you on a structured plan instead of guesswork, at a fraction of the cost of a personal trainer. Along the way, you learn the science just by using the app.
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
          {/* Plan Your Volume */}
          <div
            onClick={() => navigate('/how-it-works#volume-model')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Plan Your Volume</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Choose a starting set count for every exercise, then review per-muscle-group volume charts before you commit, with a warning if a plan runs past what most lifters recover from. From there your sets adjust each week from what you actually log, capped per muscle group.
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
              Every session comes with target weights, rep ranges, and RIR (reps in reserve) goals, in pounds or kilograms. Weights only go up when you hit the last session's targets, and every block ends with a deload week. Just follow the guide and log your sets.
            </p>
          </div>

          {/* Works Offline */}
          <div
            onClick={() => navigate('/how-it-works#offline')}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-900/30"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m9.9 9.9a5 5 0 010-7.072m-7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Works Without Signal</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Basements, car parks, and gyms with no bars of reception. Log every set as normal. Nothing blocks on the network, and your sets sync themselves the moment you are back online.
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
              Strength Guider introduces concepts like progressive overload, RIR-based intensity, and periodization as you train. You learn to structure your training into mesocycles, the building blocks of a long-term program.
            </p>
          </div>
        </div>

        {/* Beginners */}
        <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-white font-semibold text-lg mb-2">
            Good for your first structured block
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Serious training apps tend to assume you already know what a mesocycle is. Three
            of the ready-made blocks are built for people who don't yet, including a
            machines-only one if free weights are still intimidating. Pick one, and the app
            explains RIR, volume and progression as you go rather than asking you to
            configure them first.
          </p>
          <button
            onClick={goToHowItWorks}
            className="mt-3 text-teal-400 hover:text-teal-300 text-sm font-medium underline"
          >
            See how it works
          </button>
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
                  <h3 className="text-white font-medium">Review Your Plan</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Set each exercise's starting sets and weekly increase, then check the per-muscle-group volume charts before confirming your block.</p>
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
                  <h3 className="text-white font-medium">Progress Every Week</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Weight targets build automatically on your logged performance, and RIR ramps toward failure as the block peaks.</p>
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

      {/* Offline: the clearest head-to-head win, so it gets its own band
          rather than sitting as one card among four */}
      <section className="bg-teal-900/30 border-t border-b border-teal-800 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            No signal? Train anyway.
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            Your whole block is on the device before you get to the gym. Log every set as
            normal in a basement, a car park, or anywhere with no bars. Nothing waits on
            the network, and your sets sync themselves the moment you are back online.
          </p>
          <p className="text-gray-400 text-sm">
            Most training apps stop working the moment reception does.
          </p>
        </div>
      </section>

      {/* Use It Anywhere */}
      <section className="bg-gray-800 border-t border-b border-gray-700 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Nothing to Install
          </h2>
          <p className="text-gray-300 text-center leading-relaxed max-w-2xl mx-auto mb-10">
            Open it and train. Strength Guider runs on your phone, tablet and computer from
            the same account, so the session you log on the gym floor is already there on
            the laptop afterwards. Improvements reach you the moment they ship, without an
            update to approve or a store to visit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Start in Seconds</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Go to <span className="text-teal-400">strength-guider.com</span>, sign in, and
                you are training. Nothing to download, nothing taking up space on your phone.
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
                On your phone, tap <span className="text-teal-400 inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4" /></svg>Share</span> and select <span className="text-teal-400 inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" /></svg>Add to Home Screen</span>. It opens
                full screen and sits alongside your other apps, and it keeps itself up to
                date.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Comparison. Deliberately not naming a competitor: their prices and
          features change, and a stale claim on our own marketing page is worse
          than a general one. Every row about us is verifiable in the product. */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          How We Compare
        </h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Against the well-known science-based training apps.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium py-3 pr-4"></th>
                <th className="text-left text-teal-400 font-semibold py-3 px-4">Strength Guider</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Typically elsewhere</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {[
                ['Price', '$4.99 / month', 'Around $25–35 / month'],
                ['Free trial', '5 days, no card up front', 'Often none, money back only'],
                ['Works offline', 'Yes, log everything with no signal', 'Usually needs a connection'],
                ['How volume adapts', 'From the sets you logged', 'Soreness and pump questions each session'],
                ['For a first block', '3 beginner blocks, one machines-only', 'Usually aimed at intermediate and up'],
              ].map(([label, ours, theirs]) => (
                <tr key={label} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4 text-gray-400">{label}</td>
                  <td className="py-3 px-4 text-white font-medium">{ours}</td>
                  <td className="py-3 px-4 text-gray-400">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs mt-4">
          Other apps' pricing and features are as publicly listed and can change. Ours is
          what you get today.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Common Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Do I need to know what a mesocycle is?',
              a: "No. Pick one of the ready-made blocks and start. The app explains RIR, volume and progression as you go. Three of the blocks are built for people running their first structured programme, including one using only machines.",
            },
            {
              q: 'What if I miss a workout?',
              a: "Nothing expires. Every session of the block is there from the start, and you open whichever one you are doing next. Miss a week and you carry on where you left off.",
            },
            {
              q: 'What equipment do I need?',
              a: "Whatever you have. There are blocks for barbells, dumbbells only, and machines only, and 140 exercises to swap between. If a machine is taken, swap the exercise mid-workout and the change carries through the rest of the block.",
            },
            {
              q: 'Do I have to download an app?',
              a: "There is nothing to install. It runs in your browser on any device, and on a phone you can add it to your home screen so it opens full screen and sits with your other apps. It updates itself, so you are always on the current version.",
            },
            {
              q: 'Pounds or kilograms?',
              a: "Either. Pick your unit and everything, including the weight steps it asks you to add, is calculated in it, because 5 lb is not a number any kilo plate rack can make.",
            },
            {
              q: 'Can I cancel?',
              a: "Any time, from your account, and you keep access until the period you paid for ends. The first 5 days are free and do not ask for a card.",
            },
            {
              q: 'What happens to my training history if I stop?',
              a: "It stays on your account. Come back later and your logged sets, estimated strength and best lifts are still there.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="bg-gray-800 rounded-lg border border-gray-700 p-4 group">
              <summary className="text-white font-medium cursor-pointer list-none flex justify-between items-center gap-4">
                {q}
                <span className="text-teal-400 shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-gray-400 text-sm leading-relaxed mt-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Why this exists. Standing in for the ratings and testimonial walls the
          bigger apps use. We do not have those yet, and inventing them is not
          an option. Being straight about being small is the honest version. */}
      <section className="bg-gray-800 border-t border-b border-gray-700 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Why This Exists</h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            Structured training works, and the apps that do it properly cost more per month
            than a lot of gym memberships. Strength Guider was built to do the part that
            actually matters, which is to plan a block, guide every session, and adjust from
            what you lifted, without the price tag or the questionnaires.
          </p>
          <p className="text-gray-300 leading-relaxed">
            It is small and independent, so there is no wall of celebrity endorsements here.
            What there is: the full method written out in plain language before you pay a
            penny, and five days to decide whether it fits how you train.
          </p>
          <div className="text-center mt-6">
            <button
              onClick={goToHowItWorks}
              className="border border-teal-400 text-teal-300 hover:bg-teal-900 font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Read the Method
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-md mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">One Plan</h2>
        <div className="bg-gray-800 rounded-lg border-2 border-teal-600 p-6 text-center">
          <div className="text-4xl font-bold text-white">
            $4.99<span className="text-lg font-medium text-gray-400">/month</span>
          </div>
          <p className="text-teal-400 text-sm font-medium mt-2 mb-5">
            First 5 days free, no card up front
          </p>
          <ul className="text-left space-y-2 mb-6">
            {[
              'Every feature, nothing held back for a higher tier',
              '16 ready-made blocks and 140 exercises',
              'Sets that adjust from your logged performance',
              'Full offline training and syncing',
              'Progress charts, plate maths and warmup ramps',
              'Cancel any time, from your account',
            ].map((line) => (
              <li key={line} className="text-gray-300 text-sm flex gap-2">
                <span className="text-teal-400 shrink-0">✓</span>
                {line}
              </li>
            ))}
          </ul>
          <Link
            to="/login"
            className="block bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Start Free
          </Link>
        </div>
        <p className="text-gray-500 text-xs text-center mt-4">
          No annual lock-in, because a monthly price this size does not need one.
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to Train?</h2>
        <p className="text-gray-400 mb-6">Free for 5 days, then $4.99/month. Cancel anytime.</p>
        <Link
          to="/login"
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Start Free
        </Link>
        <p className="text-gray-500 mt-4 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-300 transition-colors">
            Sign in
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8 px-4 text-center space-y-2">
        <p className="text-gray-400 text-sm">
          Questions or feedback?{' '}
          <a href="mailto:strengthguider@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
            strengthguider@gmail.com
          </a>
          {' '}&middot;{' '}
          <Link to="/terms" className="text-teal-400 hover:text-teal-300 transition-colors">
            Terms of Service
          </Link>
          {' '}&middot;{' '}
          <Link to="/privacy" className="text-teal-400 hover:text-teal-300 transition-colors">
            Privacy Policy
          </Link>
        </p>
        <p className="text-gray-500 text-xs">&copy; 2026 Strength Guider. All rights reserved.</p>
      </footer>
    </main>
  );
}
