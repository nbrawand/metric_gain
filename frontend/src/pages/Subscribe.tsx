import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createCheckoutSession, createPortalSession } from '../api/billing';
import { apiErrorDetail } from '../api/client';

export default function Subscribe() {
  const { accessToken, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A failed payment locks the app, which lands the user here, and this is the
  // only page they can reach. Checking out again would open a second
  // subscription next to the one that needs a working card, so past_due gets
  // the billing portal instead.
  const paymentFailed = user?.subscription_status === 'past_due';

  const handleSubscribe = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(accessToken);
      window.location.href = url;
    } catch (err) {
      setError(apiErrorDetail(err, 'Could not start checkout. Please try again.'));
      setLoading(false);
    }
  };

  const handleManage = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await createPortalSession(accessToken);
      window.location.href = url;
    } catch (err) {
      setError(apiErrorDetail(err, 'Could not open the billing portal. Please try again.'));
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
        <h1 className="text-3xl font-bold text-white mb-2">
          {paymentFailed ? 'Update Your Payment Method' : 'Subscribe to Strength Guider'}
        </h1>
        {paymentFailed && (
          <p className="text-red-400 text-sm mb-4">
            Your last payment did not go through. Update your card to get back to training.
          </p>
        )}
        {trialExpired && (
          <p className="text-red-400 text-sm mb-4">
            Your free trial has ended. Subscribe to continue.
          </p>
        )}

        <div className="my-8">
          <span className="text-5xl font-bold text-white">$4.99</span>
          <span className="text-gray-400 text-lg">/month</span>
          <p className="text-gray-400 text-sm mt-2">Free for 5 days, then $4.99/month. Cancel anytime.</p>
        </div>

        <ul className="text-left text-gray-300 space-y-3 mb-8">
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Plan your own volume: starting sets and a weekly increase per exercise</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Review weekly sets per muscle group before you commit to a block</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Guided workouts with automatic weight targets and an RIR ramp</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-teal-400 mt-0.5">&#10003;</span>
            <span>Ready-made mesocycle templates and 115 exercises</span>
          </li>
        </ul>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={paymentFailed ? handleManage : handleSubscribe}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Redirecting...' : paymentFailed ? 'Manage Subscription' : 'Subscribe Now'}
        </button>

        <p className="text-gray-500 text-xs mt-4">
          {paymentFailed
            ? 'Opens the Stripe billing portal, where you can update your card or cancel.'
            : 'Secure payment via Stripe. Cancel anytime.'}
        </p>
      </div>
    </main>
  );
}
