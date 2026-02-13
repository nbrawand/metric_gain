/**
 * Mesocycles page - List and create training mesocycles
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMesocycles,
  createMesocycle,
  deleteMesocycle,
  getMesocycle,
  listMesocycleInstances,
  startMesocycleInstance,
} from '../api/mesocycles';
import { getExercises } from '../api/exercises';
import { createWorkoutSession } from '../api/workoutSessions';
import { useAuthStore } from '../stores/authStore';
import {
  MesocycleListItem,
  MesocycleCreate,
  WorkoutTemplateCreate,
  WorkoutExerciseCreate,
  MesocycleInstanceListItem,
} from '../types/mesocycle';
import { Exercise } from '../types/exercise';

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

  // Form state for creating mesocycle
  const [mesocycleData, setMesocycleData] = useState({
    name: '',
    description: '',
    weeks: 6,
    days_per_week: 4,
  });

  // Workout templates state
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplateCreate[]>([]);

  // Load mesocycles and exercises
  useEffect(() => {
    loadData();
  }, []);

  // Initialize workout templates when days_per_week changes
  useEffect(() => {
    const newTemplates: WorkoutTemplateCreate[] = [];
    for (let i = 0; i < mesocycleData.days_per_week; i++) {
      newTemplates.push({
        name: `Day ${i + 1} Workout`,
        description: '',
        order_index: i,
        exercises: [],
      });
    }
    setWorkoutTemplates(newTemplates);
  }, [mesocycleData.days_per_week]);

  const loadData = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const [mesocyclesData, instancesData, exercisesData] = await Promise.all([
        listMesocycles(accessToken),
        listMesocycleInstances(undefined, accessToken),
        getExercises({}, accessToken),
      ]);
      setMesocycles(mesocyclesData);
      setInstances(instancesData);
      setExercises(exercisesData);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !confirm('Are you sure you want to delete this mesocycle?')) {
      return;
    }

    try {
      await deleteMesocycle(id, accessToken);
      setMesocycles(mesocycles.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to delete mesocycle');
      console.error('Error deleting mesocycle:', err);
    }
  };

  const handleStartMesocycle = async (mesocycle: MesocycleListItem) => {
    if (!accessToken) return;

    // Check if there's already an active instance
    const hasActiveInstance = instances.some(i => i.status === 'active');
    if (hasActiveInstance) {
      alert('You already have an active mesocycle. Please complete or end it before starting a new one.');
      return;
    }

    try {
      // Create a new mesocycle instance
      const today = new Date().toISOString().split('T')[0];
      const instance = await startMesocycleInstance({
        mesocycle_template_id: mesocycle.id,
        start_date: today,
      }, accessToken);

      // Fetch full mesocycle details to get the first workout template
      const fullMesocycle = await getMesocycle(mesocycle.id, accessToken);

      if (!fullMesocycle.workout_templates || fullMesocycle.workout_templates.length === 0) {
        alert('This mesocycle has no workout templates. Please add workouts first.');
        return;
      }

      // Create the first workout session (Week 1, Day 1)
      const firstTemplate = fullMesocycle.workout_templates.find(wt => wt.order_index === 0) || fullMesocycle.workout_templates[0];

      const session = await createWorkoutSession({
        mesocycle_instance_id: instance.id,
        workout_template_id: firstTemplate.id,
        workout_date: today,
        week_number: 1,
        day_number: 1,
      }, accessToken);

      // Navigate to the workout execution page
      navigate(`/workout/${session.id}`);
    } catch (err: any) {
      if (err?.detail) {
        alert(err.detail);
      } else {
        alert('Failed to start mesocycle');
      }
      console.error('Error starting mesocycle:', err);
    }
  };

  const handleCreateMesocycle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      alert('Not authenticated');
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
    } catch (err: any) {
      const errorMessage = err?.detail || 'Failed to create mesocycle';
      alert(errorMessage);
      console.error('Error creating mesocycle:', err);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setMesocycleData({
      name: '',
      description: '',
      weeks: 6,
      days_per_week: 4,
    });
    setWorkoutTemplates([]);
  };

  const updateWorkoutTemplate = (index: number, field: string, value: string) => {
    const updated = [...workoutTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setWorkoutTemplates(updated);
  };

  const addExerciseToWorkout = (workoutIndex: number) => {
    const updated = [...workoutTemplates];
    updated[workoutIndex].exercises.push({
      exercise_id: exercises[0]?.id || 1,
      order_index: updated[workoutIndex].exercises.length,
      target_sets: 3,
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
    setWorkoutTemplates(updated);
  };

  // Check if there's already an active instance
  const hasActiveInstance = instances.some(i => i.status === 'active');

  if (loading) {
    return <div className="p-8 text-gray-300 bg-gray-900 min-h-screen">Loading mesocycles...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300 mb-3 inline-block"
          >
            &larr; Back to Home
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Mesocycle Templates</h1>
              <p className="text-gray-400 mt-1">Plan and manage your training blocks</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              Create Mesocycle Template
            </button>
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
            <p className="text-gray-300 text-lg">No mesocycles yet</p>
            <p className="text-gray-400 mt-2">Create your first training block to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mesocycles.map((mesocycle) => (
              <div
                key={mesocycle.id}
                className="bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-700"
                onClick={() => navigate(`/mesocycles/${mesocycle.id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-white">{mesocycle.name}</h3>
                    <div className="flex gap-2">
                      {mesocycle.is_stock && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                          Stock
                        </span>
                      )}
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-300">
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
                        handleStartMesocycle(mesocycle);
                      }}
                      disabled={hasActiveInstance}
                      className={`px-4 py-2 rounded text-sm font-medium transition ${
                        hasActiveInstance
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {hasActiveInstance ? 'Active Meso Running' : 'Start Instance'}
                    </button>
                    {!mesocycle.is_stock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(mesocycle.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm font-medium ml-auto"
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
            <h2 className="text-2xl font-bold text-white mb-4">Completed Mesocycles</h2>
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
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Create Mesocycle Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                <h2 className="text-2xl font-bold text-white">Create New Mesocycle</h2>
              </div>

              <form onSubmit={handleCreateMesocycle} className="p-6">
                {/* Mesocycle Basic Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Mesocycle Name *
                    </label>
                    <input
                      type="text"
                      value={mesocycleData.name}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={mesocycleData.description}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Weeks (3-12) *
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="12"
                      value={mesocycleData.weeks}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, weeks: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Training Days Per Week *
                    </label>
                    <select
                      value={mesocycleData.days_per_week}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, days_per_week: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
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

                  {workoutTemplates.map((workout, dayIndex) => (
                      <div key={dayIndex} className="border border-gray-600 rounded-lg p-4 mb-4 bg-gray-700">
                        <div className="mb-3">
                          <h4 className="font-medium text-white mb-1">Day {dayIndex + 1}</h4>
                          <p className="text-xs text-gray-400">Workout for training day {dayIndex + 1}</p>
                        </div>

                        <div className="space-y-3 mb-4">
                          <input
                            type="text"
                            placeholder="Workout name"
                            value={workout.name}
                            onChange={(e) =>
                              updateWorkoutTemplate(dayIndex, 'name', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                            required
                          />

                          <textarea
                            placeholder="Description (optional)"
                            value={workout.description}
                            onChange={(e) =>
                              updateWorkoutTemplate(dayIndex, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                            rows={2}
                          />
                        </div>

                        {/* Exercises */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-300">Exercises</span>
                            <button
                              type="button"
                              onClick={() => addExerciseToWorkout(dayIndex)}
                              className="bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-700"
                            >
                              Add Exercise
                            </button>
                          </div>

                          {workout.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              className="border border-gray-500 rounded p-3 bg-gray-600"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-gray-300">
                                  Exercise {exerciseIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Exercise</label>
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
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-sm text-white"
                                  >
                                    {exercises.map((ex) => (
                                      <option key={ex.id} value={ex.id}>
                                        {ex.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
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
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                                  />
                                </div>

                                <p className="text-xs text-gray-400 italic">
                                  Sets, reps, and RIR will be automatically determined by the algorithm.
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-800"
                  >
                    {creating ? 'Creating...' : 'Create Mesocycle Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
