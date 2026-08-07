/**
 * Home page - displayed after sign-in
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getActiveMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions } from '../api/workoutSessions';
import { createPortalSession } from '../api/billing';
import { MesocycleInstance } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';
import OnboardingWizard from '../components/OnboardingWizard';
import { apiErrorDetail, isApiError } from '../api/client';

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accessToken, updatePreferences } = useAuthStore();
  const [activeInstance, setActiveInstance] = useState<MesocycleInstance | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!user?.preferences) return true;
    try {
      const prefs = JSON.parse(user.preferences);
      return !prefs.onboarding_completed;
    } catch {
      return true;
    }
  });

  // Keyed on the navigation, not just mount: ending a mesocycle from the
  // calendar overlay navigates to "/" without remounting Home, and a stale
  // "Continue Mesocycle" card would keep pointing into the finished block.
  useEffect(() => {
    loadActiveInstance();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadActiveInstance is redefined each render; including it would refetch on every render. Keyed on the navigation, which is what should reload it.
  }, [location.key]);

  const loadActiveInstance = async () => {
    if (!accessToken) return;

    try {
      const instance = await getActiveMesocycleInstance(accessToken);
      setActiveInstance(instance);
      // Load workout sessions for the active instance
      const sessions = await listWorkoutSessions(
        { mesocycle_instance_id: instance.id },
        accessToken
      );
      setWorkoutSessions(sessions);
    } catch (err) {
      // 404 means no active instance, which is fine
      if (!isApiError(err) || err.status !== 404) {
        console.error('Error loading active mesocycle instance:', err);
      }
      setActiveInstance(null);
    }
  };

  const handleContinueMesocycle = async () => {
    if (!activeInstance || !accessToken) return;

    // All sessions are created upfront, find the first uncompleted one
    const unfinished = workoutSessions
      .filter(s => s.status !== 'completed')
      .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number);

    if (unfinished.length > 0) {
      navigate(`/workout/${unfinished[0].id}`);
    } else {
      // All done, shouldn't normally reach here with an active instance
      navigate('/mesocycles');
    }
  };

  const mesocycle = activeInstance?.mesocycle_template;

  // Take the week from the next workout due rather than dividing completed
  // workouts by days/week: sessions can be done out of order, and the division
  // ran past the end of the block once everything was finished.
  const completedCount = workoutSessions.filter(s => s.status === 'completed').length;
  // Spans the deload week, so "week 5 of 5" doesn't sit there while a deload
  // session is still waiting to be done
  const totalWeeks =
    activeInstance?.total_weeks || activeInstance?.template_weeks || mesocycle?.weeks || 0;
  const nextUnfinished = workoutSessions
    .filter(s => s.status !== 'completed')
    .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)[0];
  const currentWeek = Math.min(nextUnfinished?.week_number ?? totalWeeks, totalWeeks);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    try {
      await updatePreferences({ onboarding_completed: true });
    } catch (err) {
      console.error('Error saving onboarding preference:', err);
    }
  };


  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Active Mesocycle Card */}
        {activeInstance && mesocycle && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-xl p-4 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
                  {mesocycle.name}
                </h2>
                <p className="text-teal-100 text-sm sm:text-base">
                  Week {currentWeek} of {totalWeeks}
                  {' • '}
                  {completedCount} workout{completedCount === 1 ? "" : "s"} completed
                </p>
              </div>
              <button
                onClick={handleContinueMesocycle}
                className="bg-white text-teal-700 px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-teal-50 transition-colors shadow-lg w-full sm:w-auto"
              >
                Continue Mesocycle →
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Welcome, {user?.full_name || user?.email}!
          </h2>

          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Getting Started</h3>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li>Check out <Link to="/how-it-works" className="text-teal-400 font-medium hover:text-teal-300">How It Works</Link> to learn the basics</li>
              <li>Open the menu and choose <Link to="/mesocycles" className="text-teal-400 font-medium hover:text-teal-300">Mesocycles</Link></li>
              <li>Create a new mesocycle template with your workouts</li>
              <li>Click Start Mesocycle to begin training</li>
              <li>Return here and click {activeInstance ? <a href="#" onClick={(e) => { e.preventDefault(); handleContinueMesocycle(); }} className="text-teal-400 font-medium hover:text-teal-300">Continue Mesocycle</a> : <span>Continue Mesocycle</span>} to log workouts</li>
            </ol>
          </div>

          <div className="mt-6">
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Your Account</h4>
              <dl className="space-y-1">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Email:</dt>
                  <dd className="text-gray-200">{user?.email}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Account Status:</dt>
                  <dd className={user?.is_active ? 'text-green-400' : 'text-red-400'}>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Timezone:</dt>
                  <dd className="text-gray-200">{user?.timezone}</dd>
                </div>
              </dl>
              {/* Anyone who has ever checked out has a Stripe customer to
                  manage. Gating this on "active" hid the portal from exactly
                  the people who need it, a failed card or a cancellation. */}
              {['active', 'past_due', 'canceled'].includes(user?.subscription_status ?? '') && (
                <button
                  onClick={async () => {
                    if (!accessToken) return;
                    try {
                      const { url } = await createPortalSession(accessToken);
                      window.location.href = url;
                    } catch (err) {
                      // Surface the reason, "no subscription to manage yet" and
                      // "payments are not configured" need different responses
                      alert(apiErrorDetail(err, 'Could not open the billing portal. Please try again.'));
                    }
                  }}
                  className="mt-3 w-full bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Manage Subscription
                </button>
              )}
              <p className="mt-3 text-center text-xs text-gray-400">
                Need help?{' '}
                <a href="mailto:strengthguider@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                  strengthguider@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
