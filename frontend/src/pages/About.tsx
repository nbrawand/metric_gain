import { Link } from 'react-router-dom';

export default function About() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">About</h1>
      </div>

      {/* Why We Built This */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Why We Built This</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          There's a lot of bad workout advice out there. We believe evidence-based exercise science can genuinely improve people's lives, so we built an app around it.
        </p>
        <p className="text-gray-300 leading-relaxed mb-3">
          Our goal is to help you understand the principles that actually drive results: progressive overload, structured mesocycles, fatigue management, and recovery. Not gimmicks, not guesswork. Just concepts backed by research, built into a tool that guides you through them.
        </p>
        <p className="text-gray-300 leading-relaxed">
          We want this app to be two things: <span className="text-white font-medium">informative</span> and <span className="text-white font-medium">affordable</span>. You shouldn't need a degree in exercise science or an expensive coach to train effectively.
        </p>
      </section>

      {/* Your Data Is Yours */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">Your Data Is Yours</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          We will never sell your data to advertisers. Period.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Your workout data is only used for one purpose: science! Your data is used to create better mathematical models in the app so that you, and everyone using the app, get more effective training recommendations. Not too much volume, not too little. Just the right amount to keep you progressing.
        </p>
      </section>

      {/* CTA */}
      <div className="text-center pt-2 pb-4">
        <Link
          to="/how-it-works"
          className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
        >
          See How It Works →
        </Link>
      </div>
    </main>
  );
}
