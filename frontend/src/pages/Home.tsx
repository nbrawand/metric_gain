/**
 * Home/Dashboard page - displayed after login
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getActiveMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions, createWorkoutSession } from '../api/workoutSessions';
import { MesocycleInstance } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';

export function Home() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [activeInstance, setActiveInstance] = useState<MesocycleInstance | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);

  useEffect(() => {
    loadActiveInstance();
  }, []);

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
    } catch (err: any) {
      // 404 means no active instance, which is fine
      if (err?.status !== 404) {
        console.error('Error loading active mesocycle instance:', err);
      }
      setActiveInstance(null);
    }
  };

  const handleContinueMesocycle = async () => {
    if (!activeInstance || !accessToken) return;
    const meso = activeInstance.mesocycle_template;
    if (!meso) return;

    const daysPerWeek = meso.workout_templates?.length || meso.days_per_week;

    // 1. Find the last (most recent) unfinished workout session
    const unfinished = workoutSessions
      .filter(s => s.status !== 'completed')
      .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number);

    if (unfinished.length > 0) {
      navigate(`/workout/${unfinished[0].id}`);
      return;
    }

    // 2. All existing sessions are completed — find the next slot and create a new session
    for (let week = 1; week <= meso.weeks; week++) {
      for (let day = 1; day <= daysPerWeek; day++) {
        const existing = workoutSessions.find(
          s => s.week_number === week && s.day_number === day
        );
        if (existing) continue;

        const templateIndex = day - 1;
        const template = meso.workout_templates?.[templateIndex];
        if (!template) continue;

        try {
          const newSession = await createWorkoutSession({
            mesocycle_instance_id: activeInstance.id,
            workout_template_id: template.id,
            workout_date: new Date().toISOString().split('T')[0],
            week_number: week,
            day_number: day,
          }, accessToken);
          navigate(`/workout/${newSession.id}`);
        } catch (err) {
          console.error('Error creating workout session:', err);
        }
        return;
      }
    }
  };

  const mesocycle = activeInstance?.mesocycle_template;

  return (
    <>
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
                  Week {Math.floor(workoutSessions.filter(s => s.status === 'completed').length / mesocycle.days_per_week) + 1} of {mesocycle.weeks}
                  {' • '}
                  {workoutSessions.filter(s => s.status === 'completed').length} workouts completed
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
              <li>Check out <a href="/how-it-works" className="text-teal-400 font-medium hover:text-teal-300">How It Works</a> to learn the basics</li>
              <li>Click <a href="/mesocycles" className="text-teal-400 font-medium hover:text-teal-300">Mesocycles</a> in the menu above</li>
              <li>Create a new mesocycle template with your workouts</li>
              <li>Click Start Instance to begin training</li>
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
    </>
  );
}
