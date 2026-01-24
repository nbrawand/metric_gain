import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getWorkoutSession, updateWorkoutSet, updateWorkoutSession, listWorkoutSessions, createWorkoutSession } from '../api/workoutSessions';
import { getMesocycle, updateMesocycle } from '../api/mesocycles';
import { WorkoutSession, WorkoutSet, WorkoutSessionListItem } from '../types/workout_session';
import { Mesocycle } from '../types/mesocycle';

export default function WorkoutExecution() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [allSessions, setAllSessions] = useState<WorkoutSessionListItem[]>([]);
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

      // Load all sessions for this mesocycle
      const sessions = await listWorkoutSessions(
        { mesocycle_id: sessionData.mesocycle_id },
        accessToken
      );
      setAllSessions(sessions);

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
    if (!accessToken || !session || !mesocycle) return;

    try {
      await updateWorkoutSession(
        session.id,
        { status: 'completed' },
        accessToken
      );

      // Check if all workouts in the mesocycle are now completed
      const totalWorkouts = mesocycle.weeks * (mesocycle.workout_templates?.length || mesocycle.days_per_week);
      const completedCount = allSessions.filter(s => s.status === 'completed').length + 1; // +1 for this workout

      if (completedCount >= totalWorkouts) {
        // All workouts completed, end the mesocycle
        await updateMesocycle(mesocycle.id, { status: 'completed' }, accessToken);
      }

      navigate('/');
    } catch (err) {
      console.error('Error completing workout:', err);
    }
  };

  const getDayLabel = (dayNumber: number): string => {
    return `Day ${dayNumber}`;
  };

  const getSessionStatus = (weekNum: number, dayNum: number): 'completed' | 'in_progress' | 'skipped' | null => {
    const foundSession = allSessions.find(
      s => s.week_number === weekNum && s.day_number === dayNum
    );
    if (!foundSession) return null;
    return foundSession.status;
  };

  const getSessionId = (weekNum: number, dayNum: number): number | null => {
    const foundSession = allSessions.find(
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
    } else if (mesocycle && accessToken) {
      // No session exists, create one for this week/day
      const templateIndex = dayNum - 1;
      const template = mesocycle.workout_templates?.[templateIndex];

      if (!template) {
        console.error('No workout template found for day', dayNum);
        return;
      }

      try {
        const newSession = await createWorkoutSession({
          mesocycle_id: mesocycle.id,
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

  const getWeightRecommendation = (set: WorkoutSet): string => {
    // If the set already has weight, don't override
    if (set.weight > 0) return '';

    // Use target weight if available
    if (set.target_weight && set.target_weight > 0) {
      return `Suggested: ${set.target_weight} lbs`;
    }

    return '';
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
            onClick={() => navigate('/')}
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
          WEEK {session.week_number} &bull; DAY {session.day_number}
        </h2>
      </div>

      {/* Calendar Popup */}
      {showCalendar && mesocycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm text-gray-400 uppercase">Weeks</h3>
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

                {/* Day Rows - use actual number of workout templates */}
                {Array.from({ length: mesocycle.workout_templates?.length || mesocycle.days_per_week }, (_, i) => i + 1).map(dayNum => (
                  <div key={dayNum} className="flex gap-2 mb-2">
                    {/* Day Label */}
                    <div className="w-12 flex items-center">
                      <span className="text-xs text-gray-400">{getDayLabel(dayNum)}</span>
                    </div>

                    {/* Week Cells */}
                    {Array.from({ length: mesocycle.weeks }, (_, i) => i + 1).map(weekNum => {
                      const status = getSessionStatus(weekNum, dayNum);
                      const sessId = getSessionId(weekNum, dayNum);
                      const isCurrentSession = sessId === session?.id;

                      return (
                        <div key={weekNum} className="flex-1 min-w-[60px]">
                          <button
                            onClick={() => handleCalendarCellClick(weekNum, dayNum)}
                            className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                              status === 'completed'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : status === 'in_progress'
                                ? 'bg-teal-800 text-white hover:bg-teal-700'
                                : status === 'skipped'
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                            } ${
                              isCurrentSession ? 'ring-2 ring-white' : ''
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
                  {exerciseSets.sort((a, b) => a.set_number - b.set_number).map((set) => {
                    const recommendation = getWeightRecommendation(set);
                    return (
                      <div key={set.id} className="mb-3">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-1 text-gray-500">⋮</div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              value={set.weight}
                              onChange={(e) => handleSetUpdate(set.id, 'weight', e.target.value)}
                              className="w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder={set.target_weight ? set.target_weight.toString() : "0"}
                            />
                            {recommendation && (
                              <div className="text-xs text-teal-400 text-center mt-1">
                                {recommendation}
                              </div>
                            )}
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => handleSetUpdate(set.id, 'reps', e.target.value)}
                              className="w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder={set.target_reps ? set.target_reps.toString() : "0"}
                            />
                            {set.target_reps && set.reps === 0 && (
                              <div className="text-xs text-gray-400 text-center mt-1">
                                Target: {set.target_reps} reps
                              </div>
                            )}
                          </div>

                          <div className="col-span-3 flex justify-center">
                            <div className={`w-8 h-8 rounded border-2 ${
                              set.weight > 0 && set.reps > 0
                                ? 'bg-teal-500 border-teal-500'
                                : 'border-gray-600'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
