import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { getWorkoutSession, updateWorkoutSet, addWorkoutSet, updateWorkoutSession } from '../api/workoutSessions';
import { getMesocycle } from '../api/mesocycles';
import { WorkoutSession, WorkoutSet } from '../types/workout_session';
import { Mesocycle } from '../types/mesocycle';

export default function WorkoutExecution() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkoutSession();
  }, [sessionId]);

  const loadWorkoutSession = async () => {
    if (!accessToken || !sessionId) return;

    try {
      setLoading(true);
      const sessionData = await getWorkoutSession(parseInt(sessionId), accessToken);
      setSession(sessionData);

      // Load mesocycle data
      const mesocycleData = await getMesocycle(sessionData.mesocycle_id, accessToken);
      setMesocycle(mesocycleData);

      setError(null);
    } catch (err) {
      setError('Failed to load workout session');
      console.error('Error loading workout session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetUpdate = async (setId: number, field: string, value: string) => {
    if (!accessToken || !session) return;

    try {
      const numValue = field === 'notes' ? value : parseFloat(value);
      await updateWorkoutSet(
        session.id,
        setId,
        { [field]: field === 'notes' ? value : numValue },
        accessToken
      );

      // Reload session to get updated data
      await loadWorkoutSession();
    } catch (err) {
      console.error('Error updating set:', err);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!accessToken || !session) return;

    try {
      await updateWorkoutSession(
        session.id,
        { status: 'completed' },
        accessToken
      );
      navigate('/mesocycles');
    } catch (err) {
      console.error('Error completing workout:', err);
    }
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(session?.workout_date || '');
    return days[date.getDay()];
  };

  // Group exercises by muscle group
  const groupedExercises = session?.workout_sets.reduce((acc, set) => {
    const muscleGroup = set.exercise?.muscle_group || 'Other';
    if (!acc[muscleGroup]) {
      acc[muscleGroup] = [];
    }
    acc[muscleGroup].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>) || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading workout...</div>
      </div>
    );
  }

  if (error || !session || !mesocycle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || 'Workout not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gray-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/mesocycles')}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-gray-400 hover:text-white"
          >
            📅
          </button>
        </div>
        <h1 className="text-sm text-gray-400 uppercase">{mesocycle.name}</h1>
        <h2 className="text-lg font-semibold">
          WEEK {session.week_number} DAY {session.day_number} {getDayName(session.day_number)}
        </h2>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Mesocycle Progress</h3>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-400 text-center">
              Calendar view coming soon...
            </div>
          </div>
        </div>
      )}

      {/* Exercises grouped by muscle group */}
      <div className="p-4 space-y-4">
        {Object.entries(groupedExercises).map(([muscleGroup, sets]) => {
          // Group sets by exercise
          const exerciseGroups = sets.reduce((acc, set) => {
            const exerciseName = set.exercise?.name || 'Unknown';
            if (!acc[exerciseName]) {
              acc[exerciseName] = [];
            }
            acc[exerciseName].push(set);
            return acc;
          }, {} as Record<string, WorkoutSet[]>);

          return (
            <div key={muscleGroup}>
              {/* Muscle Group Badge */}
              <div className="inline-block bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded mb-2">
                {muscleGroup.toUpperCase()}
              </div>

              {/* Exercise Cards */}
              {Object.entries(exerciseGroups).map(([exerciseName, exerciseSets]) => (
                <div key={exerciseName} className="bg-gray-800 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{exerciseName}</h3>
                      <p className="text-xs text-gray-400">
                        {exerciseSets[0]?.exercise?.equipment || 'BODYWEIGHT'}
                      </p>
                    </div>
                    <button className="text-gray-400">ⓘ</button>
                  </div>

                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-4 text-center">WEIGHT</div>
                    <div className="col-span-4 text-center">REPS ⓘ</div>
                    <div className="col-span-3 text-center">LOG</div>
                  </div>

                  {/* Sets */}
                  {exerciseSets.sort((a, b) => a.set_number - b.set_number).map((set) => (
                    <div key={set.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <div className="col-span-1 text-gray-500">⋮</div>

                      <input
                        type="number"
                        value={set.weight}
                        onChange={(e) => handleSetUpdate(set.id, 'weight', e.target.value)}
                        className="col-span-4 bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="0"
                      />

                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => handleSetUpdate(set.id, 'reps', e.target.value)}
                        className="col-span-4 bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="0"
                      />

                      <div className="col-span-3 flex justify-center">
                        <div className={`w-8 h-8 rounded border-2 ${
                          set.weight > 0 && set.reps > 0
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-gray-600'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Complete Workout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 shadow-lg">
        <button
          onClick={handleCompleteWorkout}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg"
        >
          Complete Workout
        </button>
      </div>
    </div>
  );
}
