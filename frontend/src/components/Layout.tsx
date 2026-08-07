import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getActiveMesocycleInstance, updateMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions } from '../api/workoutSessions';
import { MesocycleInstance } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';
import {
  weightUnitFromPreferences,
  weightUnitLabel,
  WeightUnit,
  restTimerFromPreferences,
  REST_TIMER_PRESETS,
} from '../utils/units';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeInstance, setActiveInstance] = useState<MesocycleInstance | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, accessToken, isAuthenticated, user, updatePreferences } = useAuthStore();
  const [switchingUnit, setSwitchingUnit] = useState(false);
  const weightUnit = weightUnitFromPreferences(user?.preferences);
  const restTimer = restTimerFromPreferences(user?.preferences);
  const [savingRestTimer, setSavingRestTimer] = useState(false);

  const handleRestTimerChange = async (next: { enabled?: boolean; seconds?: number }) => {
    if (savingRestTimer) return;
    setSavingRestTimer(true);
    try {
      await updatePreferences({
        rest_timer_enabled: next.enabled ?? restTimer.enabled,
        rest_timer_seconds: next.seconds ?? restTimer.seconds,
      });
    } finally {
      setSavingRestTimer(false);
    }
  };

  const handleUnitChange = async (unit: WeightUnit) => {
    if (unit === weightUnit || switchingUnit) return;
    setSwitchingUnit(true);
    try {
      // The server converts every weight already logged. Without that the
      // numbers keep their value and only change label, turning a 225 lb
      // squat into a 225 kg one and poisoning every future target.
      await updatePreferences({ weight_unit: unit });
    } finally {
      setSwitchingUnit(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadActiveInstance();
    } else {
      setActiveInstance(null);
      setWorkoutSessions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadActiveInstance is redefined each render; including it would refetch the active block on every render. Keyed on the token and the route instead.
  }, [accessToken, location.pathname]);

  const loadActiveInstance = async () => {
    if (!accessToken) return;
    try {
      const instance = await getActiveMesocycleInstance(accessToken);
      setActiveInstance(instance);
      const sessions = await listWorkoutSessions(
        { mesocycle_instance_id: instance.id },
        accessToken
      );
      setWorkoutSessions(sessions);
    } catch {
      setActiveInstance(null);
      setWorkoutSessions([]);
    }
  };

  const handleNav = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleCurrentMesocycle = () => {
    setMenuOpen(false);
    if (activeInstance) {
      setShowCalendar(true);
    }
  };

  const mesocycle = activeInstance?.mesocycle_template;
  // The snapshot taken when the block started: the template itself can be
  // edited (or re-seeded on deploy, for stock ones) mid-block, which would
  // otherwise resize the calendar and hide sessions the user still has to do.
  const instanceWeeks = activeInstance?.template_weeks || mesocycle?.weeks || 0;
  // Day count from the same snapshot, so a template edited or re-seeded
  // mid-block cannot resize the calendar under the user
  const instanceDays =
    activeInstance?.template_days_per_week || mesocycle?.workout_templates?.length || 0;

  const getDayLabel = (dayNumber: number): string => `Day ${dayNumber}`;

  const getSessionStatus = (weekNum: number, dayNum: number): 'completed' | 'in_progress' | 'skipped' | null => {
    const found = workoutSessions.find(s => s.week_number === weekNum && s.day_number === dayNum);
    if (!found) return null;
    return found.status;
  };

  const getSessionId = (weekNum: number, dayNum: number): number | null => {
    const found = workoutSessions.find(s => s.week_number === weekNum && s.day_number === dayNum);
    return found?.id || null;
  };

  const handleCalendarCellClick = async (weekNum: number, dayNum: number) => {
    const sessId = getSessionId(weekNum, dayNum);
    if (sessId) {
      navigate(`/workout/${sessId}`);
      setShowCalendar(false);
    }
  };

  const handleEndMesocycle = async () => {
    if (!activeInstance || !accessToken) return;
    if (!confirm('Are you sure you want to end this mesocycle? This will mark it as completed.')) return;

    try {
      await updateMesocycleInstance(activeInstance.id, { status: 'completed' }, accessToken);
      setShowCalendar(false);
      setActiveInstance(null);
      setWorkoutSessions([]);
      navigate('/');
    } catch (err) {
      console.error('Error ending mesocycle:', err);
      alert('Could not end that mesocycle. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold text-white hover:text-teal-400 transition-colors">
          Strength Guider
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-gray-300 hover:text-white p-2"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMenuOpen(false)}
          />

          {/* Slide-in Panel */}
          <div className="relative w-72 max-w-[80vw] bg-gray-800 h-full shadow-xl flex flex-col animate-slide-in-right">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-400 hover:text-white text-xl p-1"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4">
              {isAuthenticated ? (
                <>
                  {activeInstance && (
                    <button onClick={handleCurrentMesocycle} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                      Current Mesocycle
                    </button>
                  )}
                  <button onClick={() => handleNav('/mesocycles')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Mesocycles
                  </button>
                  <button onClick={() => handleNav('/exercises')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Exercises
                  </button>
                  <button onClick={() => handleNav('/progress')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Progress
                  </button>
                  <button onClick={() => handleNav('/account')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Account
                  </button>
                  <button onClick={() => handleNav('/how-it-works')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    How It Works
                  </button>
                  <button onClick={() => handleNav('/')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Home
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleNav('/')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    Home
                  </button>
                  <button onClick={() => handleNav('/how-it-works')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                    How It Works
                  </button>
                </>
              )}
            </nav>

            {/* Footer */}
            <div className="px-4 pb-8 pt-4 border-t border-gray-700">
              {isAuthenticated && (
                <div className="pb-4 mb-2 border-b border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Weight units</div>
                  <div className="flex gap-2">
                    {(['lb', 'kg'] as WeightUnit[]).map((unit) => (
                      <button
                        key={unit}
                        onClick={() => handleUnitChange(unit)}
                        disabled={switchingUnit}
                        className={`flex-1 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                          weightUnit === unit
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {weightUnitLabel(unit)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Switching converts the weights you've already logged.
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="text-sm text-gray-400">Rest timer</span>
                      <input
                        type="checkbox"
                        checked={restTimer.enabled}
                        disabled={savingRestTimer}
                        onChange={(e) => handleRestTimerChange({ enabled: e.target.checked })}
                        className="h-4 w-4 accent-teal-500"
                      />
                    </label>
                    {restTimer.enabled && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {REST_TIMER_PRESETS.map((seconds) => (
                          <button
                            key={seconds}
                            onClick={() => handleRestTimerChange({ seconds })}
                            disabled={savingRestTimer}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                              restTimer.seconds === seconds
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Off by default. Resting until you feel ready beats resting until a
                      clock says so, but the countdown is here if you want it.
                    </p>
                  </div>
                </div>
              )}
              {isAuthenticated ? (
                <button onClick={handleLogout} className="w-full text-left text-lg text-red-400 hover:text-red-300 py-4 transition-colors">
                  Sign Out
                </button>
              ) : (
                <button onClick={() => handleNav('/login')} className="w-full text-left text-lg text-teal-400 hover:text-teal-300 py-4 transition-colors">
                    Sign In
                  </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mesocycle Calendar Popup */}
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
                  {Array.from({ length: instanceWeeks }, (_, i) => i + 1).map(weekNum => (
                    <div key={weekNum} className="flex-1 min-w-[60px] text-center">
                      <div className="text-xs text-gray-400 font-semibold">
                        {`${weekNum}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Rows */}
                {Array.from({ length: instanceDays }, (_, i) => i + 1).map(dayNum => (
                  <div key={dayNum} className="flex gap-2 mb-2">
                    <div className="w-12 flex items-center">
                      <span className="text-xs text-gray-400">{getDayLabel(dayNum)}</span>
                    </div>
                    {Array.from({ length: instanceWeeks }, (_, i) => i + 1).map(weekNum => {
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

      {/* Trial Banner */}
      {isAuthenticated && user?.subscription_status === 'trialing' && user?.trial_ends_at && (() => {
        const daysLeft = Math.max(0, Math.ceil((new Date(user.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        if (daysLeft <= 0) return null;
        return (
          <div className="bg-teal-700 text-white text-center text-sm py-2 px-4">
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial
          </div>
        );
      })()}

      {/* Page Content */}
      <Outlet />
    </div>
  );
}
