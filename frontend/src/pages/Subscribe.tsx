import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createCheckoutSession } from '../api/billing';

export default function Subscribe() {
  const { accessToken, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(accessToken);
      window.location.href = url;
    } catch {
      setError('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const trialExpired =
    user?.subscription_status === 'trialing' &&
    user?.trial_ends_at &&
    new Date(user.trial_ends_at) <= new Date();

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-gray-800 rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Strength Guider Pro</h1>
        {trialExpired && (
          <p className="text-red-400 text-sm mb-4">
            Your free trial has ended. Subscribe to continue.
          </p>
        )}

        <div className="my-8">
          <span className="text-5xl font-bold text-white">$4.99</span>
          <span className="text-gray-400 text-lg">/month</span>
        </div>

        <ul className="text-left text-gray-300 space-y-3 mb-8">
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Personalized volume optimization for every muscle group</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Auto-generated mesocycle programs</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Workout tracking with adaptive feedback</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Lifter profile with per-muscle tuning</span>
          </li>
        </ul>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Redirecting...' : 'Subscribe Now'}
        </button>

        <p className="text-gray-500 text-xs mt-4">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </main>
  );
}
