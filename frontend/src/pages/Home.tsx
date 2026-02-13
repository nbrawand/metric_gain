/**
 * Home/Dashboard page - displayed after login
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getActiveMesocycleInstance, updateMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions, createWorkoutSession } from '../api/workoutSessions';
import { MesocycleInstance } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';

export function Home() {
  const navigate = useNavigate();
  const { user, logout, accessToken } = useAuthStore();
  const [activeInstance, setActiveInstance] = useState<MesocycleInstance | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

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

  const handleContinueMesocycle = () => {
    setShowCalendar(true);
  };

  const getDayLabel = (dayNumber: number): string => {
    return `Day ${dayNumber}`;
  };

  const getSessionStatus = (weekNum: number, dayNum: number): 'completed' | 'in_progress' | 'skipped' | null => {
    const foundSession = workoutSessions.find(
      s => s.week_number === weekNum && s.day_number === dayNum
    );
    if (!foundSession) return null;
    return foundSession.status as 'completed' | 'in_progress' | 'skipped';
  };

  const getSessionId = (weekNum: number, dayNum: number): number | null => {
    const foundSession = workoutSessions.find(
      s => s.week_number === weekNum && s.day_number === dayNum
    );
    return foundSession?.id || null;
  };

  const handleCalendarCellClick = async (weekNum: number, dayNum: number) => {
    const sessId = getSessionId(weekNum, dayNum);
    if (sessId) {
      // Session exists, navigate to it
      navigate(`/workout/${sessId}`);
      setShowCalendar(false);
    } else if (activeInstance && accessToken) {
      // No session exists, create one for this week/day
      const mesocycle = activeInstance.mesocycle_template;
      const templateIndex = dayNum - 1;
      const template = mesocycle.workout_templates?.[templateIndex];

      if (!template) {
        console.error('No workout template found for day', dayNum);
        return;
      }

      try {
        const newSession = await createWorkoutSession({
          mesocycle_instance_id: activeInstance.id,
          workout_template_id: template.id,
          workout_date: new Date().toISOString().split('T')[0],
          week_number: weekNum,
          day_number: dayNum,
        }, accessToken);

        navigate(`/workout/${newSession.id}`);
        setShowCalendar(false);
      } catch (err) {
        console.error('Error creating workout session:', err);
      }
    }
  };

  const handleEndMesocycle = async () => {
    if (!activeInstance || !accessToken) return;

    if (!confirm('Are you sure you want to end this mesocycle? This will mark it as completed.')) {
      return;
    }

    try {
      await updateMesocycleInstance(activeInstance.id, { status: 'completed' }, accessToken);
      setShowCalendar(false);
      setActiveInstance(null);
      setWorkoutSessions([]);
      // Reload to check for any other active instances
      loadActiveInstance();
    } catch (err) {
      console.error('Error ending mesocycle:', err);
      alert('Failed to end mesocycle');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mesocycle = activeInstance?.mesocycle_template;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Calendar Popup */}
      {showCalendar && mesocycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">{mesocycle.name}</h3>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Week Headers */}
                <div className="flex gap-2 mb-2">
                  <div className="w-12"></div>
                  {Array.from({ length: mesocycle.weeks }, (_, i) => i + 1).map(weekNum => (
                    <div key={weekNum} className="flex-1 min-w-[60px] text-center">
                      <div className="text-xs text-gray-400 font-semibold">
                        {weekNum === mesocycle.weeks ? 'DL' : `${weekNum}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Rows */}
                {Array.from({ length: mesocycle.workout_templates?.length || mesocycle.days_per_week }, (_, i) => i + 1).map(dayNum => (
                  <div key={dayNum} className="flex gap-2 mb-2">
                    {/* Day Label */}
                    <div className="w-12 flex items-center">
                      <span className="text-xs text-gray-400">{getDayLabel(dayNum)}</span>
                    </div>

                    {/* Week Cells */}
                    {Array.from({ length: mesocycle.weeks }, (_, i) => i + 1).map(weekNum => {
                      const status = getSessionStatus(weekNum, dayNum);

                      return (
                        <div key={weekNum} className="flex-1 min-w-[60px]">
                          <button
                            onClick={() => handleCalendarCellClick(weekNum, dayNum)}
                            className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                              status === 'completed'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                            }`}
                          >
                            {getDayLabel(dayNum)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* End Mesocycle Button */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={handleEndMesocycle}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                End Mesocycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Metric Gain</h1>
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
              <button
                onClick={() => navigate('/how-it-works')}
                className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
              {activeInstance && (
                <button
                  onClick={() => setShowCalendar(true)}
                  className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
                >
                  Current Meso
                </button>
              )}
              <button
                onClick={() => navigate('/exercises')}
                className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
              >
                Exercises
              </button>
              <button
                onClick={() => navigate('/mesocycles')}
                className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
              >
                Mesocycles
              </button>
              <button
                onClick={handleLogout}
                className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
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

          <p className="text-gray-300 mb-6">
            You've successfully logged in to Metric Gain. This is your dashboard where you'll
            be able to manage your workouts, track your progress, and more.
          </p>

          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">Getting Started</h3>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li>Click <span className="text-teal-400 font-medium">Mesocycles</span> in the menu above</li>
              <li>Create a new mesocycle template with your workouts</li>
              <li>Click <span className="text-teal-400 font-medium">Start Instance</span> to begin training</li>
              <li>Return here and click <span className="text-teal-400 font-medium">Continue Mesocycle</span> to log workouts</li>
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
    </div>
  );
}
