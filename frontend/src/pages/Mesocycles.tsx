/**
 * Mesocycles page - List and create training mesocycles
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMesocycles,
  createMesocycle,
  deleteMesocycle,
} from '../api/mesocycles';
import { listExercises } from '../api/exercises';
import {
  MesocycleListItem,
  MesocycleCreate,
  WorkoutTemplateCreate,
  WorkoutExerciseCreate,
} from '../types/mesocycle';
import { Exercise } from '../types/exercise';

export default function Mesocycles() {
  const navigate = useNavigate();
  const [mesocycles, setMesocycles] = useState<MesocycleListItem[]>([]);
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
    start_date: '',
    end_date: '',
  });

  // Workout templates state
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplateCreate[]>([]);

  // Load mesocycles and exercises
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mesocyclesData, exercisesData] = await Promise.all([
        listMesocycles(),
        listExercises({}),
      ]);
      setMesocycles(mesocyclesData);
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
    if (!confirm('Are you sure you want to delete this mesocycle?')) {
      return;
    }

    try {
      await deleteMesocycle(id);
      setMesocycles(mesocycles.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to delete mesocycle');
      console.error('Error deleting mesocycle:', err);
    }
  };

  const handleCreateMesocycle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workoutTemplates.length === 0) {
      alert('Please add at least one workout template');
      return;
    }

    try {
      setCreating(true);
      const createData: MesocycleCreate = {
        name: mesocycleData.name,
        description: mesocycleData.description || undefined,
        weeks: mesocycleData.weeks,
        start_date: mesocycleData.start_date || undefined,
        end_date: mesocycleData.end_date || undefined,
        workout_templates: workoutTemplates,
      };

      await createMesocycle(createData);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Failed to create mesocycle');
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
      start_date: '',
      end_date: '',
    });
    setWorkoutTemplates([]);
  };

  const addWorkoutTemplate = () => {
    setWorkoutTemplates([
      ...workoutTemplates,
      {
        name: `Workout ${workoutTemplates.length + 1}`,
        description: '',
        order_index: workoutTemplates.length,
        exercises: [],
      },
    ]);
  };

  const updateWorkoutTemplate = (index: number, field: string, value: string) => {
    const updated = [...workoutTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setWorkoutTemplates(updated);
  };

  const removeWorkoutTemplate = (index: number) => {
    setWorkoutTemplates(workoutTemplates.filter((_, i) => i !== index));
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

  const getExerciseName = (exerciseId: number): string => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8">Loading mesocycles...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Mesocycles</h1>
            <p className="text-gray-600 mt-1">Plan and manage your training blocks</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create Mesocycle
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Mesocycles grid */}
        {mesocycles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No mesocycles yet</p>
            <p className="text-gray-500 mt-2">Create your first training block to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mesocycles.map((mesocycle) => (
              <div
                key={mesocycle.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => navigate(`/mesocycles/${mesocycle.id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{mesocycle.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        mesocycle.status
                      )}`}
                    >
                      {mesocycle.status}
                    </span>
                  </div>

                  {mesocycle.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {mesocycle.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium text-gray-900">{mesocycle.weeks} weeks</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Workouts:</span>
                      <span className="font-medium text-gray-900">{mesocycle.workout_count}</span>
                    </div>
                    {mesocycle.start_date && (
                      <div className="flex justify-between">
                        <span>Start Date:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(mesocycle.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(mesocycle.id);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Mesocycle Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-900">Create New Mesocycle</h2>
              </div>

              <form onSubmit={handleCreateMesocycle} className="p-6">
                {/* Mesocycle Basic Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mesocycle Name *
                    </label>
                    <input
                      type="text"
                      value={mesocycleData.name}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={mesocycleData.description}
                      onChange={(e) =>
                        setMesocycleData({ ...mesocycleData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={mesocycleData.start_date}
                        onChange={(e) =>
                          setMesocycleData({ ...mesocycleData, start_date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={mesocycleData.end_date}
                        onChange={(e) =>
                          setMesocycleData({ ...mesocycleData, end_date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Workout Templates */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Workout Templates</h3>
                    <button
                      type="button"
                      onClick={addWorkoutTemplate}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      Add Workout
                    </button>
                  </div>

                  {workoutTemplates.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No workouts yet. Click "Add Workout" to create one.
                    </p>
                  )}

                  {workoutTemplates.map((workout, workoutIndex) => (
                    <div key={workoutIndex} className="border rounded-lg p-4 mb-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900">Workout {workoutIndex + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeWorkoutTemplate(workoutIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-3 mb-4">
                        <input
                          type="text"
                          placeholder="Workout name"
                          value={workout.name}
                          onChange={(e) =>
                            updateWorkoutTemplate(workoutIndex, 'name', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />

                        <textarea
                          placeholder="Description (optional)"
                          value={workout.description}
                          onChange={(e) =>
                            updateWorkoutTemplate(workoutIndex, 'description', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={2}
                        />
                      </div>

                      {/* Exercises */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Exercises</span>
                          <button
                            type="button"
                            onClick={() => addExerciseToWorkout(workoutIndex)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Add Exercise
                          </button>
                        </div>

                        {workout.exercises.map((exercise, exerciseIndex) => (
                          <div
                            key={exerciseIndex}
                            className="border border-gray-200 rounded p-3 bg-white"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Exercise {exerciseIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeExercise(workoutIndex, exerciseIndex)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="col-span-2">
                                <select
                                  value={exercise.exercise_id}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'exercise_id',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  {exercises.map((ex) => (
                                    <option key={ex.id} value={ex.id}>
                                      {ex.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Sets</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={exercise.target_sets}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'target_sets',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Reps Min</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={exercise.target_reps_min}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'target_reps_min',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Reps Max</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={exercise.target_reps_max}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'target_reps_max',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Starting RIR</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={exercise.starting_rir}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'starting_rir',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Ending RIR</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={exercise.ending_rir}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'ending_rir',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div className="col-span-2">
                                <label className="text-xs text-gray-600">Notes</label>
                                <input
                                  type="text"
                                  value={exercise.notes || ''}
                                  onChange={(e) =>
                                    updateExercise(
                                      workoutIndex,
                                      exerciseIndex,
                                      'notes',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional notes"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {creating ? 'Creating...' : 'Create Mesocycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
