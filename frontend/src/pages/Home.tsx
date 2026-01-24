/**
 * Home/Dashboard page - displayed after login
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { listMesocycles } from '../api/mesocycles';
import { listWorkoutSessions } from '../api/workoutSessions';
import { MesocycleListItem } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';

export function Home() {
  const navigate = useNavigate();
  const { user, logout, accessToken } = useAuthStore();
  const [activeMesocycle, setActiveMesocycle] = useState<MesocycleListItem | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);

  useEffect(() => {
    loadActiveMesocycle();
  }, []);

  const loadActiveMesocycle = async () => {
    if (!accessToken) return;

    try {
      const mesocycles = await listMesocycles(accessToken);
      const active = mesocycles.find(m => m.status === 'active');

      if (active) {
        setActiveMesocycle(active);
        // Load workout sessions for the active mesocycle
        const sessions = await listWorkoutSessions(
          { mesocycle_id: active.id },
          accessToken
        );
        setWorkoutSessions(sessions);
      }
    } catch (err) {
      console.error('Error loading active mesocycle:', err);
    }
  };

  const handleContinueMesocycle = async () => {
    if (!accessToken || !activeMesocycle) return;

    try {
      // Find the first in-progress workout
      const inProgress = workoutSessions.find(s => s.status === 'in_progress');
      if (inProgress) {
        navigate(`/workout/${inProgress.id}`);
        return;
      }

      // Otherwise, navigate to mesocycle detail to start next workout
      navigate(`/mesocycles/${activeMesocycle.id}`);
    } catch (err) {
      console.error('Error continuing mesocycle:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Metric Gain</h1>
              {activeMesocycle && (
                <button
                  onClick={() => navigate(`/mesocycles/${activeMesocycle.id}`)}
                  className="text-2xl hover:opacity-80 transition-opacity"
                  title="View workout calendar"
                >
                  📅
                </button>
              )}
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/exercises')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Exercises
              </button>
              <button
                onClick={() => navigate('/mesocycles')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Mesocycles
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Active Mesocycle Card */}
        {activeMesocycle && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {activeMesocycle.name}
                </h2>
                <p className="text-teal-100">
                  Week {Math.floor(workoutSessions.filter(s => s.status === 'completed').length / activeMesocycle.days_per_week) + 1} of {activeMesocycle.weeks}
                  {' • '}
                  {workoutSessions.filter(s => s.status === 'completed').length} workouts completed
                </p>
              </div>
              <button
                onClick={handleContinueMesocycle}
                className="bg-white text-teal-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-teal-50 transition-colors shadow-lg"
              >
                Continue Mesocycle →
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome, {user?.full_name || user?.email}!
          </h2>

          <p className="text-gray-300 mb-6">
            You've successfully logged in to Metric Gain. This is your dashboard where you'll
            be able to manage your workouts, track your progress, and more.
          </p>

          <div className="bg-gray-700 border border-gray-600 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">Phase 1: Complete!</h3>
            <p className="text-gray-300 mb-4">
              Authentication is now fully implemented. Coming soon in future phases:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Exercise library and custom exercise creation</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Mesocycle planning and workout scheduling</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Workout logging with progressive overload tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Auto-regulation based on pump, soreness, and challenge feedback</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Progress visualization and analytics</span>
              </li>
            </ul>
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
                  <dd className="text-green-400">
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Timezone:</dt>
                  <dd className="text-gray-200">{user?.timezone}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
