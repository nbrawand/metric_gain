import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getActiveMesocycleInstance, updateMesocycleInstance } from '../api/mesocycles';
import { listWorkoutSessions, createWorkoutSession } from '../api/workoutSessions';
import { MesocycleInstance } from '../types/mesocycle';
import { WorkoutSessionListItem } from '../types/workout_session';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeInstance, setActiveInstance] = useState<MesocycleInstance | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionListItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, accessToken } = useAuthStore();

  useEffect(() => {
    loadActiveInstance();
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
    } else if (activeInstance && accessToken && mesocycle) {
      const templateIndex = dayNum - 1;
      const template = mesocycle.workout_templates?.[templateIndex];
      if (!template) return;

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
    if (!confirm('Are you sure you want to end this mesocycle? This will mark it as completed.')) return;

    try {
      await updateMesocycleInstance(activeInstance.id, { status: 'completed' }, accessToken);
      setShowCalendar(false);
      setActiveInstance(null);
      setWorkoutSessions([]);
      navigate('/');
    } catch (err) {
      console.error('Error ending mesocycle:', err);
      alert('Failed to end mesocycle');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold text-white hover:text-teal-400 transition-colors">
          Metric Gain
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
              <button onClick={() => handleNav('/how-it-works')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                How It Works
              </button>
              <button onClick={() => handleNav('/')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                Home
              </button>
            </nav>

            {/* Logout */}
            <div className="px-4 pb-8 pt-4 border-t border-gray-700">
              <button onClick={handleLogout} className="w-full text-left text-lg text-red-400 hover:text-red-300 py-4 transition-colors">
                Logout
              </button>
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
                    <div className="w-12 flex items-center">
                      <span className="text-xs text-gray-400">{getDayLabel(dayNum)}</span>
                    </div>
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

      {/* Page Content */}
      <Outlet />
    </div>
  );
}
