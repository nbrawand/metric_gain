/**
 * Mesocycles page - List and create training mesocycles
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMesocycles,
  createMesocycle,
  createMesocycleFromInstance,
  deleteMesocycle,
  getMesocycle,
  listMesocycleInstances,
  startMesocycleInstance,
} from '../api/mesocycles';
import { getExercises } from '../api/exercises';
import { listWorkoutSessions } from '../api/workoutSessions';
import { useAuthStore } from '../stores/authStore';
import {
  Mesocycle,
  MesocycleListItem,
  MesocycleCreate,
  WorkoutTemplateCreate,
  WorkoutExerciseCreate,
  MesocycleInstanceListItem,
} from '../types/mesocycle';
import { Exercise } from '../types/exercise';
import {
  computeWeeklyVolumeByMuscleGroup,
  findVolumeWarnings,
  volumeInputsForTemplate,
} from '../utils/volume';
import MuscleGroupVolumeChart from '../components/MuscleGroupVolumeChart';
import ClampedNumberInput from '../components/ClampedNumberInput';
import { apiErrorDetail } from '../api/client';

export default function Mesocycles() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [mesocycles, setMesocycles] = useState<MesocycleListItem[]>([]);
  const [instances, setInstances] = useState<MesocycleInstanceListItem[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  // 'build' = editing the template, 'review' = per-muscle-group volume charts before confirming
  const [createStep, setCreateStep] = useState<'build' | 'review'>('build');

  // Start Mesocycle Modal state
  const [showStartModal, setShowStartModal] = useState(false);
  const [startingMesocycle, setStartingMesocycle] = useState<MesocycleListItem | null>(null);
  const [startingMesocycleDetail, setStartingMesocycleDetail] = useState<Mesocycle | null>(null);
  // On by default: set counts follow what gets logged. Off replays the
  // template's weekly increase regardless, for lifters driving it themselves.
  const [autoregulateVolume, setAutoregulateVolume] = useState(true);
  const [selectedSourceInstance, setSelectedSourceInstance] = useState<number | null>(null);
  const [selectedSourceWeek, setSelectedSourceWeek] = useState<number | null>(null);

  // Form state for creating mesocycle
  const [mesocycleData, setMesocycleData] = useState({
    name: '',
    description: '',
    weeks: 6,
    days_per_week: 4,
    // Default volume mode for blocks started from this template. Chosen here
    // rather than only at start time, because it decides whether the weekly
    // increases below do anything at all.
    autoregulate_volume: true,
  });

  // Workout templates state
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplateCreate[]>([]);

  // Collapsed state for workout day sections in create modal
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  // Ref to hold pre-populated workout templates (from copy) so the days_per_week effect doesn't overwrite them
  const pendingTemplatesRef = useRef<WorkoutTemplateCreate[] | null>(null);

  // Which template the start modal is currently previewing, so a slow response
  // for a previously opened one cannot paint its charts over a newer modal
  const startDetailRequestRef = useRef<number | null>(null);

  // Load mesocycles and exercises
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is redefined each render; including it would refetch on every render. This is a mount-only load.
  }, []);

  const blankDay = (index: number): WorkoutTemplateCreate => ({
    name: `Day ${index + 1} Workout`,
    description: '',
    order_index: index,
    exercises: [],
  });

  // Build the day cards when the create modal opens. Keying this on
  // days_per_week alone left the modal empty on every reopen, since resetForm
  // puts days_per_week back to its default.
  useEffect(() => {
    if (!showCreateModal) return;
    if (pendingTemplatesRef.current) {
      setWorkoutTemplates(pendingTemplatesRef.current);
      pendingTemplatesRef.current = null;
      return;
    }
    setWorkoutTemplates(
      Array.from({ length: mesocycleData.days_per_week }, (_, i) => blankDay(i))
    );
    // Only on open: resizing is handled by the days/week control itself, which
    // must not throw away days the user has already filled in.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- days_per_week is deliberately omitted, see the comment above; resizing is handled by the days/week control so filled-in days are not discarded.
  }, [showCreateModal]);

  // Add or drop day cards to match, keeping the ones already filled in
  const setDaysPerWeek = (days: number) => {
    setMesocycleData((prev) => ({ ...prev, days_per_week: days }));
    setWorkoutTemplates((prev) => {
      if (days === prev.length) return prev;
      if (days < prev.length) return prev.slice(0, days);
      return [
        ...prev,
        ...Array.from({ length: days - prev.length }, (_, i) => blankDay(prev.length + i)),
      ];
    });
    // Forget days that no longer exist. Collapsed state is keyed by index, so
    // dropping to 2 days and back to 4 otherwise handed the removed day's
    // collapsed flag to the blank one taking its place, a day you just added
    // showed up already closed.
    setCollapsedDays((prev) => {
      const kept = [...prev].filter((index) => index < days);
      return kept.length === prev.size ? prev : new Set(kept);
    });
  };

  const loadData = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const [mesocyclesData, instancesData, exercisesData] = await Promise.all([
        listMesocycles(accessToken),
        listMesocycleInstances(undefined, accessToken),
        getExercises({ limit: 500 }, accessToken),
      ]);
      setMesocycles(mesocyclesData);
      setInstances(instancesData);
      setExercises(exercisesData);
      setError(null);
    } catch (err) {
      setError('Could not load your templates. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guards the async buttons that had no in-flight state: a double tap used to
  // create two templates, or fire two copies/instance-ends
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleCreateFromInstance = async (instanceId: number) => {
    if (!accessToken || busyAction) return;
    setBusyAction("create-from-instance");
    try {
      const newMeso = await createMesocycleFromInstance(instanceId, accessToken);
      await loadData();
      navigate(`/mesocycles/${newMeso.id}`);
    } catch (err) {
      alert(apiErrorDetail(err, "Could not create a template from that mesocycle."));
      console.error("Error creating template from instance:", err);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !confirm("Are you sure you want to delete this mesocycle template?")) {
      return;
    }

    try {
      await deleteMesocycle(id, accessToken);
      // Functional update: a second delete started while this one was in
      // flight used to filter the pre-delete list and put the first one back.
      setMesocycles((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(apiErrorDetail(err, "Could not delete that mesocycle template."));
      console.error('Error deleting mesocycle:', err);
    }
  };

  const handleCopyMesocycle = async (id: number) => {
    if (!accessToken || busyAction) return;
    setBusyAction("copy-template");

    try {
      const original = await getMesocycle(id, accessToken);

      const copiedTemplates: WorkoutTemplateCreate[] = original.workout_templates.map((wt) => ({
        name: wt.name,
        description: wt.description,
        order_index: wt.order_index,
        exercises: wt.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          target_sets: ex.target_sets,
          weekly_set_increment: ex.weekly_set_increment ?? 0,
          target_reps_min: ex.target_reps_min,
          target_reps_max: ex.target_reps_max,
          starting_rir: ex.starting_rir,
          ending_rir: ex.ending_rir,
          notes: ex.notes,
        })),
      }));

      // Store templates in ref so the days_per_week effect uses them instead of blank ones
      pendingTemplatesRef.current = copiedTemplates;

      setMesocycleData({
        name: `${original.name} (Copy)`,
        description: original.description || '',
        weeks: original.weeks,
        autoregulate_volume: original.autoregulate_volume ?? true,
        days_per_week: original.days_per_week,
      });

      setShowCreateModal(true);
    } catch (err) {
      alert("Could not load that mesocycle to copy.");
      console.error("Error copying mesocycle:", err);
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartMesocycle = async (
    mesocycle: MesocycleListItem,
    sourceInstanceId?: number | null,
    sourceWeekNumber?: number | null,
  ) => {
    if (!accessToken) return;

    // Check if there's already an active instance
    const hasActiveInstance = instances.some(i => i.status === 'active');
    if (hasActiveInstance) {
      alert('You already have an active mesocycle. End it before starting a new one.');
      return;
    }

    try {
      // Create instance, backend now creates all sessions upfront.
      // Built from local date parts, not toISOString: that converts to UTC, so
      // starting a block on a weekday evening west of UTC dated it tomorrow.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const instanceData: import('../types/mesocycle').MesocycleInstanceCreate = {
        mesocycle_template_id: mesocycle.id,
        start_date: today,
        autoregulate_volume: autoregulateVolume,
      };

      if (sourceInstanceId && sourceWeekNumber) {
        instanceData.source_instance_id = sourceInstanceId;
        instanceData.source_week_number = sourceWeekNumber;
      }

      const instance = await startMesocycleInstance(instanceData, accessToken);

      // All sessions are already created, find the first one (week 1, day 1)
      const sessions = await listWorkoutSessions(
        { mesocycle_instance_id: instance.id },
        accessToken
      );

      const firstSession = sessions
        .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)[0];

      if (firstSession) {
        navigate(`/workout/${firstSession.id}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      alert(apiErrorDetail(err, 'Failed to start mesocycle'));
      console.error('Error starting mesocycle:', err);
    }
  };

  const handleCreateMesocycle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    // Check if all days have at least one exercise
    const hasEmptyWorkouts = workoutTemplates.some(w => w.exercises.length === 0);
    if (hasEmptyWorkouts) {
      alert('Please add at least one exercise to each training day');
      return;
    }

    try {
      setCreating(true);
      const createData: MesocycleCreate = {
        name: mesocycleData.name,
        description: mesocycleData.description || undefined,
        weeks: mesocycleData.weeks,
        days_per_week: mesocycleData.days_per_week,
        workout_templates: workoutTemplates,
      };

      await createMesocycle(createData, accessToken);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      const errorMessage = apiErrorDetail(err, 'Could not create the template. Please try again.');
      alert(errorMessage);
      console.error('Error creating mesocycle:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleDayCollapsed = (index: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const resetForm = () => {
    setMesocycleData({
      name: '',
      description: '',
      weeks: 6,
      days_per_week: 4,
      autoregulate_volume: true,
    });
    setWorkoutTemplates([]);
    setCollapsedDays(new Set());
    setCreateStep('build');
    // Otherwise an abandoned copy repopulates the next template the user builds
    pendingTemplatesRef.current = null;
  };

  const handleReviewPlan = () => {
    // The build fields are hidden during review, so validate here, the browser
    // cannot report a constraint violation on an input it cannot focus.
    if (!mesocycleData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (workoutTemplates.length === 0) {
      alert('Please add at least one training day');
      return;
    }
    if (workoutTemplates.some(w => !w.name.trim())) {
      alert('Please give every training day a workout name');
      return;
    }
    // Check if all days have at least one exercise
    const hasEmptyWorkouts = workoutTemplates.some(w => w.exercises.length === 0);
    if (hasEmptyWorkouts) {
      alert('Please add at least one exercise to each training day');
      return;
    }
    setCreateStep('review');
  };

  // Weekly set totals per muscle group for the create-form review charts
  const reviewVolumeByMuscleGroup = computeWeeklyVolumeByMuscleGroup(
    volumeInputsForTemplate(
      workoutTemplates,
      (id) => exercises.find((e) => e.id === id)?.muscle_group,
      mesocycleData.autoregulate_volume
    ),
    mesocycleData.weeks
  );

  // Muscle groups the plan drives past a recoverable weekly ceiling. Shown at
  // the review step rather than blocking creation: it is the lifter's plan, but
  // rendering 65 chest sets in week 6 without comment reads as endorsement.
  const reviewVolumeWarnings = findVolumeWarnings(reviewVolumeByMuscleGroup);

  const updateWorkoutTemplate = (index: number, field: string, value: string) => {
    const updated = [...workoutTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setWorkoutTemplates(updated);
  };

  const addExerciseToWorkout = (workoutIndex: number) => {
    const updated = [...workoutTemplates];
    const alreadyUsed = new Set(updated[workoutIndex].exercises.map((e) => e.exercise_id));
    // A day may not list the same exercise twice; the backend rejects the
    // whole template for it, and defaulting every new row to exercises[0]
    // walked straight into that on the second click.
    const nextExercise = exercises.find((ex) => !alreadyUsed.has(ex.id));
    if (!nextExercise) {
      setError('Every exercise is already in this day.');
      return;
    }
    updated[workoutIndex].exercises.push({
      exercise_id: nextExercise.id,
      order_index: updated[workoutIndex].exercises.length,
      target_sets: 3,
      weekly_set_increment: 0.5,
      target_reps_min: 8,
      target_reps_max: 12,
      starting_rir: 3,
      ending_rir: 0,
      notes: '',
    });
    setWorkoutTemplates(updated);
  };

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    field: keyof WorkoutExerciseCreate,
    value: string | number
  ) => {
    const updated = [...workoutTemplates];
    updated[workoutIndex].exercises[exerciseIndex] = {
      ...updated[workoutIndex].exercises[exerciseIndex],
      [field]: value,
    };
    setWorkoutTemplates(updated);
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    const updated = [...workoutTemplates];
    updated[workoutIndex].exercises = updated[workoutIndex].exercises.filter(
      (_, i) => i !== exerciseIndex
    );
    // Reindex, or the next added exercise reuses the gap's index and the two
    // rows collide, their sets interleave and reordering them does nothing
    updated[workoutIndex].exercises.forEach((ex, i) => { ex.order_index = i; });
    setWorkoutTemplates(updated);
  };

  const moveExercise = (workoutIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    const updated = [...workoutTemplates];
    const exercises = [...updated[workoutIndex].exercises];
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    [exercises[exerciseIndex], exercises[targetIndex]] = [exercises[targetIndex], exercises[exerciseIndex]];
    // Update order_index to match new positions
    exercises.forEach((ex, i) => { ex.order_index = i; });
    updated[workoutIndex].exercises = exercises;
    setWorkoutTemplates(updated);
  };

  // Check if there's already an active instance
  const hasActiveInstance = instances.some(i => i.status === 'active');

  // Derive sorted muscle groups from loaded exercises
  const muscleGroups = [...new Set(exercises.map(ex => ex.muscle_group))].sort();

  if (loading) {
    return <div className="p-8 text-gray-300 bg-gray-900 min-h-screen">Loading templates...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">Mesocycle Templates</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition text-sm sm:text-base w-full sm:w-auto"
              >
                Create Mesocycle Template
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Mesocycles grid */}
        {mesocycles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-300 text-lg">No mesocycle templates yet</p>
            <p className="text-gray-400 mt-2">Create your first mesocycle template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mesocycles.map((mesocycle) => (
              <div
                key={mesocycle.id}
                className="bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-700 overflow-hidden"
                onClick={() => navigate(`/mesocycles/${mesocycle.id}`)}
              >
                <div className="p-6 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="text-xl font-semibold text-white min-w-0 break-words">{mesocycle.name}</h3>
                    <div className="flex gap-2 shrink-0">
                      {mesocycle.is_stock && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                          Stock
                        </span>
                      )}
                      <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                        Template
                      </span>
                    </div>
                  </div>

                  {mesocycle.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {mesocycle.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium text-gray-200">{mesocycle.weeks} weeks</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Workouts:</span>
                      <span className="font-medium text-gray-200">{mesocycle.workout_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Days/Week:</span>
                      <span className="font-medium text-gray-200">{mesocycle.days_per_week}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasActiveInstance) return;
                        setStartingMesocycle(mesocycle);
                        setStartingMesocycleDetail(null);
                        setSelectedSourceInstance(null);
                        setSelectedSourceWeek(null);
                        // Default to what the template was built for; this modal
                        // is the per-run override, not the primary choice
                        setAutoregulateVolume(mesocycle.autoregulate_volume ?? true);
                        setShowStartModal(true);
                        if (accessToken) {
                          startDetailRequestRef.current = mesocycle.id;
                          getMesocycle(mesocycle.id, accessToken)
                            .then((detail) => {
                              if (startDetailRequestRef.current === mesocycle.id) {
                                setStartingMesocycleDetail(detail);
                              }
                            })
                            .catch((err) => {
                              console.error('Failed to load template for the start preview:', err);
                            });
                        }
                      }}
                      disabled={hasActiveInstance}
                      className={`px-4 py-2 rounded text-sm font-medium transition ${
                        hasActiveInstance
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {hasActiveInstance ? 'Finish Your Current Mesocycle First' : 'Start Mesocycle'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/mesocycles/${mesocycle.id}`);
                      }}
                      className="px-4 py-2 rounded text-sm font-medium transition border border-gray-600 hover:bg-gray-700 text-gray-300"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyMesocycle(mesocycle.id);
                      }}
                      className="px-4 py-2 rounded text-sm font-medium transition bg-teal-600 hover:bg-teal-700 text-white ml-auto"
                    >
                      Copy
                    </button>
                    {!mesocycle.is_stock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(mesocycle.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Mesocycles */}
        {instances.filter(i => i.status === 'completed').length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-white mb-4">Past Mesocycles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instances
                .filter(i => i.status === 'completed')
                .sort((a, b) => new Date(b.end_date || b.updated_at).getTime() - new Date(a.end_date || a.updated_at).getTime())
                .map((inst) => (
                  <div key={inst.id} className="bg-gray-800 rounded-lg shadow border border-gray-700 p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-white">{inst.template_name}</h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                        Completed
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium text-gray-200">{inst.template_weeks} weeks</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days/Week:</span>
                        <span className="font-medium text-gray-200">{inst.template_days_per_week}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Started:</span>
                        <span className="font-medium text-gray-200">{new Date(inst.start_date).toLocaleDateString()}</span>
                      </div>
                      {inst.end_date && (
                        <div className="flex justify-between">
                          <span>Finished:</span>
                          <span className="font-medium text-gray-200">{new Date(inst.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCreateFromInstance(inst.id)}
                      disabled={busyAction !== null}
                      className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                    >
                      Create Template from This
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Start Mesocycle Modal */}
        {showStartModal && startingMesocycle && (() => {
          const completedForTemplate = instances.filter(
            i => i.status === 'completed' && i.mesocycle_template_id === startingMesocycle.id
          );
          const startVolumeByMuscleGroup = startingMesocycleDetail
            ? computeWeeklyVolumeByMuscleGroup(
                startingMesocycleDetail.workout_templates.flatMap(wt =>
                  wt.exercises.map(ex => ({
                    muscleGroup: ex.exercise?.muscle_group || 'Other',
                    targetSets: ex.target_sets,
                    increment: ex.weekly_set_increment ?? 0,
                  }))
                ),
                startingMesocycleDetail.weeks
              )
            : null;
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">Start: {startingMesocycle.name}</h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Planned weekly volume per muscle group */}
                  {startVolumeByMuscleGroup && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-1">Planned Weekly Sets per Muscle Group</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {autoregulateVolume
                          ? "With performance-based sets on, this is the template's plan. What you actually get each week follows what you log."
                          : 'The fixed plan this block will follow.'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(startVolumeByMuscleGroup)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([muscleGroup, weeklySets]) => (
                            <MuscleGroupVolumeChart
                              key={muscleGroup}
                              muscleGroup={muscleGroup}
                              weeklySets={weeklySets}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Volume mode */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoregulateVolume}
                        onChange={(e) => setAutoregulateVolume(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-teal-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-white">
                          Adjust sets from my performance
                        </span>
                        <span className="block text-xs text-gray-400 mt-1">
                          Hit every target and you get an extra set next week; miss most of
                          them and you get one fewer, capped at a recoverable weekly total
                          per muscle group. Turn this off to follow the template's fixed
                          weekly increase instead. Defaults to how the template was built -
                          changing it here applies to this block only.
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Start Fresh */}
                  <button
                    onClick={() => {
                      setShowStartModal(false);
                      handleStartMesocycle(startingMesocycle);
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg font-medium transition"
                  >
                    Start Fresh
                  </button>

                  {/* Start from Previous */}
                  {completedForTemplate.length > 0 && (
                    <div className="border-t border-gray-700 pt-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Start from a Previous Mesocycle</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        Seed week 1 target weights and reps from a previous run of this template.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Previous Instance</label>
                          <select
                            value={selectedSourceInstance ?? ''}
                            onChange={(e) => {
                              setSelectedSourceInstance(e.target.value ? Number(e.target.value) : null);
                              setSelectedSourceWeek(null);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                          >
                            <option value="">Select a mesocycle...</option>
                            {completedForTemplate
                              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                              .slice(0, 5)
                              .map(inst => (
                                <option key={inst.id} value={inst.id}>
                                  Started {new Date(inst.start_date).toLocaleDateString()}
                                  {', completed '}
                                  {new Date(inst.updated_at).toLocaleDateString()}{' '}
                                  {new Date(inst.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </option>
                              ))}
                          </select>
                        </div>

                        {selectedSourceInstance && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Source Week</label>
                            <select
                              value={selectedSourceWeek ?? ''}
                              onChange={(e) => setSelectedSourceWeek(e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                            >
                              <option value="">Select a week...</option>
                              {/* Weeks come from the source run, not the template,
                                  which may have been shortened since */}
                              {Array.from(
                                {
                                  length:
                                    completedForTemplate.find(i => i.id === selectedSourceInstance)
                                      ?.template_weeks || startingMesocycle.weeks,
                                },
                                (_, i) => i + 1
                              ).map(w => (
                                <option key={w} value={w}>Week {w}</option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Week 1 target weights and reps are seeded from the week you pick above.
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setShowStartModal(false);
                            handleStartMesocycle(startingMesocycle, selectedSourceInstance, selectedSourceWeek);
                          }}
                          disabled={!selectedSourceInstance || !selectedSourceWeek}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition ${
                            selectedSourceInstance && selectedSourceWeek
                              ? 'bg-teal-600 hover:bg-teal-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Start from Previous
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-700 flex justify-end">
                  <button
                    onClick={() => setShowStartModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create Mesocycle Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
        {createStep === "build" ? "Create New Mesocycle Template" : "Review Weekly Sets"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-white transition border border-gray-600 rounded-lg p-2 hover:border-gray-400"
                    title="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateMesocycle} className="p-6" noValidate>
                {/* Review step: per-muscle-group weekly volume charts */}
                {createStep === 'review' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-300 mb-4">
                      {mesocycleData.autoregulate_volume
                        ? 'Where every muscle group starts. Sets grow or shrink from here each week based on what you log, so this is the floor rather than the whole picture.'
                        : 'Total sets per muscle group each week, from your starting sets and weekly increases.'}
                      {' '}Go back to adjust, or confirm to create the template.
                    </p>

                    {reviewVolumeWarnings.length > 0 && (
                      <div className="bg-amber-900/40 border border-amber-600 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-amber-200 mb-2">
                          More volume than most lifters recover from
                        </h4>
                        <ul className="space-y-1 mb-2">
                          {reviewVolumeWarnings.map((w) => (
                            <li key={w.muscleGroup} className="text-sm text-amber-100">
                              <span className="font-medium">{w.muscleGroup}</span>{' '}
                              passes ~{w.ceiling} sets/week in week {w.firstExceededWeek},
                              peaking at {w.peakSets} in week {w.peakWeek}.
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-200/80">
                          Lower the starting sets or the weekly increase for those exercises,
                          or drop one. You can still create this template as it is.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(reviewVolumeByMuscleGroup)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([muscleGroup, weeklySets]) => (
                          <MuscleGroupVolumeChart
                            key={muscleGroup}
                            muscleGroup={muscleGroup}
                            weeklySets={weeklySets}
                          />
                        ))}
                    </div>
                  </div>
                )}

                <div className={createStep === 'build' ? '' : 'hidden'}>
                {/* Mesocycle Basic Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={mesocycleData.name}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={mesocycleData.description}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, description: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Weeks (3-12) *
                    </label>
                    <ClampedNumberInput
                      value={mesocycleData.weeks}
                      min={3}
                      max={12}
                      onChange={(weeks) => setMesocycleData({ ...mesocycleData, weeks })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Training Days Per Week *
                    </label>
                    <select
                      value={mesocycleData.days_per_week}
                      onChange={(e) =>
                        setDaysPerWeek(parseInt(e.target.value))
                      }
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    >
                      <option value="1">1 day per week</option>
                      <option value="2">2 days per week</option>
                      <option value="3">3 days per week</option>
                      <option value="4">4 days per week</option>
                      <option value="5">5 days per week</option>
                      <option value="6">6 days per week</option>
                      <option value="7">7 days per week</option>
                    </select>
                  </div>
                </div>

                {/* Workout Templates - Day Based */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Weekly Workout Schedule
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Assign a workout to each training day. You're training {mesocycleData.days_per_week} {mesocycleData.days_per_week === 1 ? 'day' : 'days'} per week.
                  </p>

                  {/* Volume mode. Here rather than only at start time, because
                      it decides whether the weekly increases below do anything. */}
                  <div className="border border-gray-600 rounded-lg p-4 mb-4 bg-gray-700/40">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mesocycleData.autoregulate_volume}
                        onChange={(e) =>
                          setMesocycleData({ ...mesocycleData, autoregulate_volume: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 accent-teal-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-white">
                          Adjust sets from my performance
                        </span>
                        <span className="block text-xs text-gray-400 mt-1">
                          {mesocycleData.autoregulate_volume
                            ? 'Hit every target in a session and that exercise gets one more set next week; miss most of them and it drops one, capped at a recoverable weekly total per muscle group. Every week starts at your starting set count.'
                            : "Each exercise follows the fixed weekly increase you set below, whatever you log. You can still change this when you start a block."}
                        </span>
                      </span>
                    </label>
                  </div>

                  {workoutTemplates.map((workout, dayIndex) => (
                      <div key={dayIndex} className="border border-gray-600 rounded-lg mb-4 bg-gray-700 overflow-hidden">
                        {/* Collapsible header */}
                        <button
                          type="button"
                          onClick={() => toggleDayCollapsed(dayIndex)}
                          className="w-full p-4 sm:px-6 flex items-center justify-between text-left hover:bg-gray-650 transition-colors"
                        >
                          <div>
                            <h4 className="font-medium text-white">Day {dayIndex + 1}: {workout.name || 'Untitled'}</h4>
                            <p className="text-xs text-gray-400">{workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}</p>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 text-gray-400 transition-transform ${collapsedDays.has(dayIndex) ? '' : 'rotate-180'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {!collapsedDays.has(dayIndex) && (
                          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                            <div className="space-y-3 mb-4">
                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Workout Name *</label>
                                <input
                                  type="text"
                                  placeholder="Workout name"
                                  value={workout.name}
                                  onChange={(e) =>
                                    updateWorkoutTemplate(dayIndex, 'name', e.target.value)
                                  }
                                  className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                                <textarea
                                  placeholder="Description (optional)"
                                  value={workout.description}
                                  onChange={(e) =>
                                    updateWorkoutTemplate(dayIndex, 'description', e.target.value)
                                  }
                                  className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  rows={2}
                                />
                              </div>
                            </div>

                            {/* Exercises */}
                            <div className="space-y-3">
                              <span className="text-sm font-medium text-gray-300">Exercises</span>

                              {workout.exercises.map((exercise, exerciseIndex) => (
                                <div
                                  key={exerciseIndex}
                                  className="border border-gray-500 rounded-lg p-3 sm:p-4 bg-gray-600"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-medium text-gray-300">
                                      Exercise {exerciseIndex + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {workout.exercises.length > 1 && (
                                        <div className="flex flex-col">
                                          <button
                                            type="button"
                                            onClick={() => moveExercise(dayIndex, exerciseIndex, 'up')}
                                            disabled={exerciseIndex === 0}
                                            className={`p-0.5 ${exerciseIndex === 0 ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveExercise(dayIndex, exerciseIndex, 'down')}
                                            disabled={exerciseIndex === workout.exercises.length - 1}
                                            className={`p-0.5 ${exerciseIndex === workout.exercises.length - 1 ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <label className="block text-gray-300 text-xs font-medium mb-1">Muscle Group</label>
                                      <select
                                        value={exercises.find(ex => ex.id === exercise.exercise_id)?.muscle_group || muscleGroups[0] || ''}
                                        onChange={(e) => {
                                          const group = e.target.value;
                                          const firstInGroup = exercises.find(ex => ex.muscle_group === group);
                                          if (firstInGroup) {
                                            updateExercise(dayIndex, exerciseIndex, 'exercise_id', firstInGroup.id);
                                          }
                                        }}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                      >
                                        {muscleGroups.map((group) => (
                                          <option key={group} value={group}>{group}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-gray-300 text-xs font-medium mb-1">Exercise</label>
                                      <select
                                        value={exercise.exercise_id}
                                        onChange={(e) =>
                                          updateExercise(
                                            dayIndex,
                                            exerciseIndex,
                                            'exercise_id',
                                            parseInt(e.target.value)
                                          )
                                        }
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                      >
                                        {exercises
                                          .filter(ex => ex.muscle_group === (exercises.find(e => e.id === exercise.exercise_id)?.muscle_group))
                                          .map((ex) => (
                                            <option key={ex.id} value={ex.id}>
                                              {ex.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-gray-300 text-xs font-medium mb-1">Notes (optional)</label>
                                      <input
                                        type="text"
                                        placeholder="Add any notes for this exercise..."
                                        value={exercise.notes || ''}
                                        onChange={(e) =>
                                          updateExercise(
                                            dayIndex,
                                            exerciseIndex,
                                            'notes',
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-gray-300 text-xs font-medium mb-1">Starting Sets (Week 1)</label>
                                        <ClampedNumberInput
                                          value={exercise.target_sets}
                                          min={1}
                                          max={10}
                                          onChange={(sets) =>
                                            updateExercise(dayIndex, exerciseIndex, 'target_sets', sets)
                                          }
                                          className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                      </div>
                                      {mesocycleData.autoregulate_volume ? (
                                        <div>
                                          <label className="block text-gray-300 text-xs font-medium mb-1">
                                            Weekly Increase
                                          </label>
                                          <p className="text-xs text-gray-400 mt-2">
                                            Set from your performance each week.
                                          </p>
                                        </div>
                                      ) : (
                                        <div>
                                          <label className="block text-gray-300 text-xs font-medium mb-1">
                                            Weekly Increase: <span className="text-teal-400">+{exercise.weekly_set_increment} sets/week</span>
                                          </label>
                                          <input
                                            type="range"
                                            min={0}
                                            max={2}
                                            step={0.5}
                                            value={exercise.weekly_set_increment}
                                            onChange={(e) =>
                                              updateExercise(
                                                dayIndex,
                                                exerciseIndex,
                                                'weekly_set_increment',
                                                parseFloat(e.target.value)
                                              )
                                            }
                                            className="w-full mt-2 accent-teal-500"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 italic">
                                      Reps and RIR targets are set automatically; RIR ramps 3 → 0 across the mesocycle.
                                    </p>
                                  </div>
                                </div>
                              ))}

                              {/* Add Exercise button at the bottom */}
                              <button
                                type="button"
                                onClick={() => addExerciseToWorkout(dayIndex)}
                                className="w-full bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                              >
                                + Add Exercise
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>

                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-800 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {createStep === 'build' ? (
                    <button
                      type="button"
                      onClick={handleReviewPlan}
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                    >
                      Review Plan
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setCreateStep('build')}
                        className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {creating ? 'Creating...' : 'Confirm & Create'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
