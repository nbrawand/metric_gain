import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getWorkoutSession, updateWorkoutSet, updateWorkoutSession, listWorkoutSessions, createWorkoutSession, submitWorkoutFeedback } from '../api/workoutSessions';
import { getMesocycleInstance, updateMesocycleInstance } from '../api/mesocycles';
import { WorkoutSession, WorkoutSet, WorkoutSessionListItem } from '../types/workout_session';
import { MesocycleInstance } from '../types/mesocycle';

// Local state for tracking input values before they're saved
type SetInputValues = Record<number, { weight: string; reps: string }>;

export default function WorkoutExecution() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [instance, setInstance] = useState<MesocycleInstance | null>(null);
  const [allSessions, setAllSessions] = useState<WorkoutSessionListItem[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionBanner, setCompletionBanner] = useState<{ week: number; day: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [muscleFeedback, setMuscleFeedback] = useState<Record<string, string>>({});

  // Local input state to prevent re-renders while typing
  const [inputValues, setInputValues] = useState<SetInputValues>({});

  useEffect(() => {
    loadWorkoutSession();
  }, [sessionId]);

  // Initialize input values when session data loads
  useEffect(() => {
    if (session) {
      const initialValues: SetInputValues = {};
      session.workout_sets.forEach((set) => {
        initialValues[set.id] = {
          weight: set.weight.toString(),
          reps: set.reps.toString(),
        };
      });
      setInputValues(initialValues);
    }
  }, [session]);

  const loadWorkoutSession = async () => {
    if (!accessToken || !sessionId) return;

    try {
      setLoading(true);
      const sessionData = await getWorkoutSession(parseInt(sessionId), accessToken);
      setSession(sessionData);

      // Load mesocycle instance data
      const instanceData = await getMesocycleInstance(sessionData.mesocycle_instance_id, accessToken);
      setInstance(instanceData);

      // Load all sessions for this instance
      const sessions = await listWorkoutSessions(
        { mesocycle_instance_id: sessionData.mesocycle_instance_id },
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

  // Handle local input change (no API call, just update local state)
  const handleInputChange = (setId: number, field: 'weight' | 'reps', value: string) => {
    // Allow empty string (user clearing the field) or valid non-negative numbers
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setInputValues((prev) => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      },
    }));

    // Also update local session state for immediate UI feedback (checkmark, etc.)
    if (session) {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workout_sets: prev.workout_sets.map((set) =>
            set.id === setId
              ? { ...set, [field]: parseFloat(value) || 0 }
              : set
          ),
        };
      });
    }
  };

  // Save to server on blur
  const handleInputBlur = useCallback(async (setId: number, field: 'weight' | 'reps') => {
    if (!accessToken || !session) return;

    const rawValue = inputValues[setId]?.[field];
    if (rawValue === undefined) return;

    let numValue = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'reps') numValue = Math.floor(numValue);

    // Update the displayed value to the cleaned number
    const displayValue = numValue.toString();
    if (rawValue !== displayValue) {
      setInputValues((prev) => ({
        ...prev,
        [setId]: { ...prev[setId], [field]: displayValue },
      }));
    }

    try {
      await updateWorkoutSet(
        session.id,
        setId,
        { [field]: numValue },
        accessToken
      );
    } catch (err) {
      console.error('Error updating set:', err);
    }
  }, [accessToken, session, inputValues]);

  // Get the display value for an input (prefer local state, fall back to session data)
  const getInputValue = (setId: number, field: 'weight' | 'reps'): string => {
    if (inputValues[setId]?.[field] !== undefined) {
      return inputValues[setId][field];
    }
    const set = session?.workout_sets.find((s) => s.id === setId);
    return set ? set[field].toString() : '0';
  };

  // Toggle skipped state for a set
  const handleToggleSkipped = async (setId: number) => {
    if (!accessToken || !session) return;

    const set = session.workout_sets.find((s) => s.id === setId);
    if (!set) return;

    const newSkipped = !set.skipped;

    // Update local state immediately for responsive UI
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workout_sets: prev.workout_sets.map((s) =>
          s.id === setId
            ? { ...s, skipped: newSkipped, weight: newSkipped ? 0 : s.weight, reps: newSkipped ? 0 : s.reps }
            : s
        ),
      };
    });

    // If marking as skipped, also clear the input values
    if (newSkipped) {
      setInputValues((prev) => ({
        ...prev,
        [setId]: { weight: '0', reps: '0' },
      }));
    }

    // Save to server
    try {
      await updateWorkoutSet(
        session.id,
        setId,
        {
          skipped: newSkipped,
          ...(newSkipped ? { weight: 0, reps: 0 } : {})
        },
        accessToken
      );
    } catch (err) {
      console.error('Error toggling skipped:', err);
      // Revert on error
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workout_sets: prev.workout_sets.map((s) =>
            s.id === setId ? { ...s, skipped: !newSkipped } : s
          ),
        };
      });
    }
  };

  // Auto-dismiss completion banner after 3 seconds
  useEffect(() => {
    if (!completionBanner) return;
    const timer = setTimeout(() => setCompletionBanner(null), 2000);
    return () => clearTimeout(timer);
  }, [completionBanner]);

  const handleCompleteWorkoutClick = () => {
    if (!session) return;
    // Initialize feedback for each muscle group in this workout
    const muscleGroups = Object.keys(groupedExercises);
    const initial: Record<string, string> = {};
    muscleGroups.forEach(mg => { initial[mg] = ''; });
    setMuscleFeedback(initial);
    setShowFeedback(true);
  };

  const handleSubmitFeedback = async () => {
    if (!accessToken || !session) return;

    // Send feedback to backend
    const feedbackItems = Object.entries(muscleFeedback)
      .filter(([, difficulty]) => difficulty !== '')
      .map(([muscle_group, difficulty]) => ({ muscle_group, difficulty }));

    if (feedbackItems.length > 0) {
      try {
        await submitWorkoutFeedback(session.id, feedbackItems, accessToken);
      } catch (err) {
        console.error('Failed to submit feedback:', err);
      }
    }

    setShowFeedback(false);
    await handleCompleteWorkout();
  };

  const handleCompleteWorkout = async () => {
    if (!accessToken || !session || !instance) return;

    const mesocycle = instance.mesocycle_template;
    const completedWeek = session.week_number;
    const completedDay = session.day_number;
    const daysPerWeek = mesocycle.workout_templates?.length || mesocycle.days_per_week;

    try {
      await updateWorkoutSession(
        session.id,
        { status: 'completed' },
        accessToken
      );

      // Check if all workouts in the mesocycle are now completed
      const totalWorkouts = mesocycle.weeks * daysPerWeek;
      const completedCount = allSessions.filter(s => s.status === 'completed').length + 1;

      if (completedCount >= totalWorkouts) {
        await updateMesocycleInstance(instance.id, { status: 'completed' }, accessToken);
        navigate('/');
        return;
      }

      // Find the next workout: next day in same week, or day 1 of next week
      let nextWeek = completedWeek;
      let nextDay = completedDay + 1;
      if (nextDay > daysPerWeek) {
        nextDay = 1;
        nextWeek = completedWeek + 1;
      }

      // If we've exceeded the total weeks, go home
      if (nextWeek > mesocycle.weeks) {
        navigate('/');
        return;
      }

      // Check if a session already exists for the next workout
      const existingSession = allSessions.find(
        s => s.week_number === nextWeek && s.day_number === nextDay
      );

      if (existingSession) {
        navigate(`/workout/${existingSession.id}`);
      } else {
        // Create the next session
        const templateIndex = nextDay - 1;
        const template = mesocycle.workout_templates?.[templateIndex];

        if (template) {
          const newSession = await createWorkoutSession({
            mesocycle_instance_id: instance.id,
            workout_template_id: template.id,
            workout_date: new Date().toISOString().split('T')[0],
            week_number: nextWeek,
            day_number: nextDay,
          }, accessToken);
          navigate(`/workout/${newSession.id}`);
        } else {
          navigate('/');
          return;
        }
      }

      // Show the completion banner for the workout we just finished
      setCompletionBanner({ week: completedWeek, day: completedDay });
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
    } else if (instance && accessToken) {
      // No session exists, create one for this week/day
      const mesocycle = instance.mesocycle_template;
      const templateIndex = dayNum - 1;
      const template = mesocycle.workout_templates?.[templateIndex];

      if (!template) {
        console.error('No workout template found for day', dayNum);
        return;
      }

      try {
        const newSession = await createWorkoutSession({
          mesocycle_instance_id: instance.id,
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
    if (set.weight > 0) return '';

    if (set.target_weight && set.target_weight > 0) {
      return `${set.target_weight} lbs`;
    }

    // No previous data available
    return 'a weight you can do at 5-15 reps at 3 RIR';
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

  const mesocycle = instance?.mesocycle_template;

  if (error || !session || !instance || !mesocycle) {
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
            className="text-gray-400 hover:text-white text-sm"
          >
            Current Mesocycle
          </button>
        </div>
        <h1 className="text-sm text-gray-400 uppercase">{mesocycle.name}</h1>
        <h2 className="text-lg font-semibold">
          WEEK {session.week_number} &bull; DAY {session.day_number}
        </h2>
      </div>

      {/* Completion Banner */}
      {completionBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none animate-slide-down">
          <div className="bg-teal-600 text-white px-6 py-3 rounded-b-lg shadow-lg text-center">
            <p className="font-semibold">Week {completionBanner.week}, Day {completionBanner.day} Complete</p>
          </div>
        </div>
      )}

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
                    <div className="col-span-3 text-center">
                      <div>LOG</div>
                      <div className="text-[10px] text-gray-500 mt-1">Sets left empty are logged as skipped</div>
                    </div>
                  </div>

                  {/* Sets */}
                  {exerciseSets.sort((a, b) => a.set_number - b.set_number).map((set) => {
                    const recommendation = getWeightRecommendation(set);
                    const isSkipped = set.skipped;
                    return (
                      <div key={set.id} className={`mb-3 ${isSkipped ? 'opacity-50' : ''}`}>
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-1 text-gray-500 pt-2">⋮</div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getInputValue(set.id, 'weight')}
                              onChange={(e) => handleInputChange(set.id, 'weight', e.target.value)}
                              onBlur={() => handleInputBlur(set.id, 'weight')}
                              disabled={isSkipped}
                              className={`w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isSkipped ? 'cursor-not-allowed line-through' : ''
                              }`}
                              placeholder={set.target_weight ? set.target_weight.toString() : "0"}
                            />
                            {recommendation && !isSkipped && (
                              <div className="text-xs text-gray-400 text-center mt-1">
                                We recommend: {recommendation}
                              </div>
                            )}
                          </div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getInputValue(set.id, 'reps')}
                              onChange={(e) => handleInputChange(set.id, 'reps', e.target.value)}
                              onBlur={() => handleInputBlur(set.id, 'reps')}
                              disabled={isSkipped}
                              className={`w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isSkipped ? 'cursor-not-allowed line-through' : ''
                              }`}
                              placeholder={set.target_reps ? set.target_reps.toString() : "0"}
                            />
                            {set.reps === 0 && !isSkipped && (() => {
                              const trainingWeeks = mesocycle.weeks - 1;
                              const weekRir = Math.min(3, trainingWeeks - session.week_number);
                              const isDeload = session.week_number === mesocycle.weeks;
                              if (isDeload) return null;
                              if (session.week_number === 1) {
                                return (
                                  <div className="text-xs text-gray-400 text-center mt-1">
                                    We recommend: {weekRir} RIR
                                  </div>
                                );
                              }
                              return (
                                <div className="text-xs text-gray-400 text-center mt-1">
                                  We recommend: {set.target_reps ? `${set.target_reps} reps or ` : ''}{weekRir} RIR
                                </div>
                              );
                            })()}
                          </div>

                          <div className="col-span-3 flex justify-center pt-1">
                            <button
                              onClick={() => handleToggleSkipped(set.id)}
                              className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-colors ${
                                set.skipped
                                  ? 'bg-gray-600 border-gray-500 text-gray-400'
                                  : set.weight > 0 && set.reps > 0
                                  ? 'bg-teal-500 border-teal-500 text-white'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                              title={set.skipped ? 'Click to unskip' : 'Click to skip this set'}
                            >
                              {set.skipped ? '✕' : set.weight > 0 && set.reps > 0 ? '✓' : ''}
                            </button>
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

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-1">Workout Report</h3>
            <p className="text-sm text-gray-400 mb-4">How did each muscle group feel?</p>

            <div className="space-y-4">
              {Object.keys(muscleFeedback).map((mg) => (
                <div key={mg}>
                  <p className="text-sm font-medium text-gray-300 mb-2">{mg}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['Easy', 'Just Right', 'Difficult', 'Too Difficult'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setMuscleFeedback(prev => ({ ...prev, [mg]: option }))}
                        className={`py-2 px-1 rounded text-xs font-medium transition-colors ${
                          muscleFeedback[mg] === option
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowFeedback(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg"
              >
                Submit & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Workout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 shadow-lg">
        <button
          onClick={handleCompleteWorkoutClick}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg"
        >
          Complete Workout
        </button>
      </div>
    </div>
  );
}
