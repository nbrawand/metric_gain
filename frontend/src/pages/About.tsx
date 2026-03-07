import { Link } from 'react-router-dom';

export default function About() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">About</h1>
      </div>

      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-3">About Strength Guider</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Strength Guider is a training tool built on principles from exercise science research. It helps organize your training into structured blocks, track your progress, and provide recommendations based on your performance history.
        </p>
        <p className="text-gray-300 leading-relaxed">
          The app is built around progressive overload, mesocycle periodization, fatigue management, and planned recovery. These are well-established concepts in the strength training literature, and Strength Guider aims to make them accessible and easy to follow.
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
