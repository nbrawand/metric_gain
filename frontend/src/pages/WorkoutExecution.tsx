import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getWorkoutSession, updateWorkoutSet, updateWorkoutSession, listWorkoutSessions, createWorkoutSession, submitWorkoutFeedback, swapExercise, removeExercise, addExercise, addSetToExercise, removeSetFromExercise } from '../api/workoutSessions';
import { getExercises } from '../api/exercises';
import { getMesocycleInstance, updateMesocycleInstance } from '../api/mesocycles';
import { WorkoutSession, WorkoutSet, WorkoutSessionListItem } from '../types/workout_session';
import { Exercise } from '../types/exercise';
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

  // Exercise management state
  const [showExerciseMenu, setShowExerciseMenu] = useState<number | null>(null); // exercise_id of open dropdown
  const [showExercisePicker, setShowExercisePicker] = useState<'swap' | 'add' | null>(null);
  const [swapTargetExerciseId, setSwapTargetExerciseId] = useState<number | null>(null);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close exercise menu on click outside
  useEffect(() => {
    if (!showExerciseMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExerciseMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExerciseMenu]);

  // Load exercises when picker opens
  useEffect(() => {
    if (!showExercisePicker || !accessToken) return;
    getExercises({ limit: 500 }, accessToken)
      .then(setAvailableExercises)
      .catch((err) => console.error('Error loading exercises:', err));
  }, [showExercisePicker, accessToken]);

  const handleRemoveExercise = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    if (!confirm('Remove this exercise from the workout?')) return;
    try {
      const updated = await removeExercise(session.id, exerciseId, accessToken);
      setSession(updated);
      setShowExerciseMenu(null);
    } catch (err) {
      console.error('Error removing exercise:', err);
    }
  };

  const handleOpenSwap = (exerciseId: number) => {
    setSwapTargetExerciseId(exerciseId);
    setShowExercisePicker('swap');
    setExerciseSearch('');
    setShowExerciseMenu(null);
  };

  const handleOpenAdd = () => {
    setShowExercisePicker('add');
    setExerciseSearch('');
  };

  const handleAddSet = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      const updated = await addSetToExercise(session.id, exerciseId, accessToken);
      setSession(updated);
    } catch (err) {
      console.error('Error adding set:', err);
    }
  };

  const handleRemoveSet = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      const updated = await removeSetFromExercise(session.id, exerciseId, accessToken);
      setSession(updated);
    } catch (err) {
      console.error('Error removing set:', err);
    }
  };

  const handleExercisePickerSelect = async (newExerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      let updated: WorkoutSession;
      if (showExercisePicker === 'swap' && swapTargetExerciseId !== null) {
        updated = await swapExercise(session.id, swapTargetExerciseId, newExerciseId, accessToken);
      } else {
        updated = await addExercise(session.id, newExerciseId, accessToken);
      }
      setSession(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to update exercise';
      alert(msg);
      console.error('Error in exercise picker:', err);
    } finally {
      setShowExercisePicker(null);
      setSwapTargetExerciseId(null);
    }
  };

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
    if (!mesocycle) return;
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
      if (!mesocycle) return;
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
    return 'a weight you can do at 5-15 reps at the recommended RIR';
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
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-sm text-gray-400 uppercase hover:text-white transition"
            >
              {mesocycle.name}
            </button>
            <h2 className="text-lg font-semibold">
              WEEK {session.week_number} &bull; DAY {session.day_number}
            </h2>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition border border-gray-600 rounded-lg p-2 hover:border-gray-400"
            title="Home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          </button>
        </div>
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

            {/* End Mesocycle Button */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to end this mesocycle? This will mark it as completed.')) return;
                  try {
                    await updateMesocycleInstance(instance.id, { status: 'completed' }, accessToken!);
                    setShowCalendar(false);
                    navigate('/');
                  } catch (err) {
                    console.error('Error ending mesocycle:', err);
                    alert('Failed to end mesocycle');
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                End Mesocycle
              </button>
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
              {Object.entries(exerciseGroups).map(([exerciseName, exerciseSets]) => {
                const exerciseId = exerciseSets[0]?.exercise_id;
                return (
                <div key={exerciseName} className="bg-gray-800 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{exerciseName}</h3>
                      <p className="text-xs text-gray-400">
                        {exerciseSets[0]?.exercise?.equipment || 'BODYWEIGHT'}
                      </p>
                    </div>
                    {session.status !== 'completed' && (
                      <div className="relative">
                        <button
                          onClick={() => setShowExerciseMenu(showExerciseMenu === exerciseId ? null : exerciseId)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                        {showExerciseMenu === exerciseId && (
                          <div ref={menuRef} className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                            <button
                              onClick={() => handleOpenSwap(exerciseId)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                            >
                              Swap Exercise
                            </button>
                            <button
                              onClick={() => handleRemoveExercise(exerciseId)}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                            >
                              Remove Exercise
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 text-xs text-gray-400 mb-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-4 text-center">WEIGHT</div>
                    <div className="col-span-4 text-center">REPS ⓘ</div>
                    <div className="col-span-3 text-center">
                      <div>LOG</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-tight">Sets left empty are logged as skipped</div>
                    </div>
                  </div>

                  {/* Sets */}
                  {exerciseSets.sort((a, b) => a.set_number - b.set_number).map((set) => {
                    const recommendation = getWeightRecommendation(set);
                    const isSkipped = set.skipped;
                    return (
                      <div key={set.id} className={`mb-3 ${isSkipped ? 'opacity-50' : ''}`}>
                        <div className="grid grid-cols-12 gap-1 sm:gap-2 items-start">
                          <div className="col-span-1 text-gray-500 pt-2">⋮</div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getInputValue(set.id, 'weight')}
                              onChange={(e) => handleInputChange(set.id, 'weight', e.target.value)}
                              onBlur={() => handleInputBlur(set.id, 'weight')}
                              disabled={isSkipped}
                              className={`w-full bg-gray-700 text-white text-center rounded py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isSkipped ? 'cursor-not-allowed line-through' : ''
                              }`}
                              placeholder={set.target_weight ? set.target_weight.toString() : "0"}
                            />
                            {recommendation && !isSkipped && (
                              <div className="text-xs text-teal-400 text-center mt-1">
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
                              className={`w-full bg-gray-700 text-white text-center rounded py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isSkipped ? 'cursor-not-allowed line-through' : ''
                              }`}
                              placeholder={set.target_reps ? set.target_reps.toString() : "0"}
                            />
                            {set.reps === 0 && !isSkipped && (() => {
                              const trainingWeeks = mesocycle.weeks - 1;
                              const isDeload = session.week_number === mesocycle.weeks;
                              const weekRir = isDeload
                                ? 8
                                : trainingWeeks <= 1
                                  ? 3
                                  : Math.round(3 * (trainingWeeks - session.week_number) / (trainingWeeks - 1));
                              return (
                                <div className="text-xs text-teal-400 text-center mt-1">
                                  We recommend: {isDeload ? '' : set.target_reps ? `${set.target_reps} reps or ` : ''}{weekRir} RIR
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

                  {/* Add/Remove Set Controls */}
                  {session.status !== 'completed' && (
                    <div className="border-t border-gray-700 pt-3 flex items-center justify-center gap-4">
                      <button
                        onClick={() => handleRemoveSet(exerciseId)}
                        disabled={exerciseSets.length <= 1}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          exerciseSets.length <= 1
                            ? 'bg-gray-700 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        −
                      </button>
                      <span className="text-sm text-gray-400">{exerciseSets.length} {exerciseSets.length === 1 ? 'set' : 'sets'}</span>
                      <button
                        onClick={() => handleAddSet(exerciseId)}
                        className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 hover:bg-teal-600 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          );
        })}

        {/* Add Exercise Button */}
        {session.status !== 'completed' && (
          <button
            onClick={handleOpenAdd}
            className="w-full border-2 border-dashed border-gray-600 rounded-lg py-3 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
          >
            + Add Exercise
          </button>
        )}
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {showExercisePicker === 'swap' ? 'Swap Exercise' : 'Add Exercise'}
              </h3>
              <button
                onClick={() => { setShowExercisePicker(null); setSwapTargetExerciseId(null); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {(() => {
                // Filter out exercises already in the session
                const currentExerciseIds = new Set(session.workout_sets.map(s => s.exercise_id));
                const filtered = availableExercises
                  .filter(ex =>
                    !currentExerciseIds.has(ex.id) &&
                    (ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                     ex.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase()))
                  );

                // Group by muscle group
                const grouped = filtered.reduce((acc, ex) => {
                  acc[ex.muscle_group] = acc[ex.muscle_group] || [];
                  acc[ex.muscle_group].push(ex);
                  return acc;
                }, {} as Record<string, Exercise[]>);

                if (Object.keys(grouped).length === 0) {
                  return <p className="text-gray-400 text-sm text-center py-4">No exercises found</p>;
                }

                return Object.entries(grouped).map(([group, exercises]) => (
                  <div key={group}>
                    <div className="text-xs text-gray-500 font-semibold uppercase px-2 py-1 sticky top-0 bg-gray-800">
                      {group}
                    </div>
                    {exercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleExercisePickerSelect(ex.id)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-white text-sm">{ex.name}</span>
                        {ex.equipment && (
                          <span className="text-gray-500 text-xs ml-2">{ex.equipment}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

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
