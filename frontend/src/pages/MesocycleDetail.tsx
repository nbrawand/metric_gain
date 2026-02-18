/**
 * Mesocycle template detail page - View and edit mesocycle templates
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getMesocycle,
  deleteMesocycle,
  updateMesocycle,
  replaceWorkoutTemplates,
} from '../api/mesocycles';
import { getExercises } from '../api/exercises';
import { useAuthStore } from '../stores/authStore';
import type { Mesocycle, WorkoutTemplateCreate, WorkoutExerciseCreate } from '../types/mesocycle';
import type { Exercise } from '../types/exercise';

export default function MesocycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    weeks: 6,
    days_per_week: 4,
  });
  const [editTemplates, setEditTemplates] = useState<WorkoutTemplateCreate[]>([]);

  // Exercises for the exercise picker
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Collapsed state for workout day sections
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      loadMesocycle();
    }
  }, [id]);

  const loadMesocycle = async () => {
    if (!id || !accessToken) return;

    try {
      setLoading(true);
      const mesocycleData = await getMesocycle(parseInt(id), accessToken);
      setMesocycle(mesocycleData);
      populateEditState(mesocycleData);
      setError(null);
    } catch (err) {
      setError('Failed to load mesocycle template');
      console.error('Error loading mesocycle:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateEditState = (meso: Mesocycle) => {
    setEditData({
      name: meso.name,
      description: meso.description || '',
      weeks: meso.weeks,
      days_per_week: meso.days_per_week,
    });
    setEditTemplates(
      meso.workout_templates.map((wt) => ({
        name: wt.name,
        description: wt.description,
        order_index: wt.order_index,
        exercises: wt.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          target_sets: ex.target_sets,
          target_reps_min: ex.target_reps_min,
          target_reps_max: ex.target_reps_max,
          starting_rir: ex.starting_rir,
          ending_rir: ex.ending_rir,
          notes: ex.notes,
        })),
      }))
    );
  };

  const startEditing = async () => {
    if (!accessToken) return;
    // Load exercises for the picker
    if (exercises.length === 0) {
      try {
        const exercisesData = await getExercises({ limit: 500 }, accessToken);
        setExercises(exercisesData);
      } catch {
        alert('Failed to load exercises');
        return;
      }
    }
    setCollapsedDays(new Set());
    setEditing(true);
  };

  const cancelEditing = () => {
    if (mesocycle) {
      populateEditState(mesocycle);
    }
    setCollapsedDays(new Set());
    setEditing(false);
  };

  const handleSave = async () => {
    if (!id || !mesocycle || !accessToken) return;

    // Validate
    const hasEmptyWorkouts = editTemplates.some((w) => w.exercises.length === 0);
    if (hasEmptyWorkouts) {
      alert('Please add at least one exercise to each training day');
      return;
    }

    try {
      setSaving(true);

      // Update mesocycle metadata
      await updateMesocycle(
        parseInt(id),
        {
          name: editData.name,
          description: editData.description || undefined,
          weeks: editData.weeks,
          days_per_week: editData.days_per_week,
        },
        accessToken
      );

      // Replace workout templates
      await replaceWorkoutTemplates(parseInt(id), editTemplates, accessToken);

      setEditing(false);
      await loadMesocycle();
    } catch (err) {
      alert('Failed to save changes');
      console.error('Error saving mesocycle:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !accessToken || !confirm('Are you sure you want to delete this mesocycle template?')) {
      return;
    }

    try {
      await deleteMesocycle(parseInt(id), accessToken);
      navigate('/mesocycles');
    } catch (err) {
      alert('Failed to delete mesocycle');
      console.error('Error deleting mesocycle:', err);
    }
  };

  // --- Edit helpers ---

  const updateWorkoutTemplate = (index: number, field: string, value: string) => {
    const updated = [...editTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setEditTemplates(updated);
  };

  const addWorkoutTemplate = () => {
    setEditTemplates([
      ...editTemplates,
      {
        name: `Day ${editTemplates.length + 1} Workout`,
        description: '',
        order_index: editTemplates.length,
        exercises: [],
      },
    ]);
  };

  const removeWorkoutTemplate = (index: number) => {
    if (!confirm('Remove this workout day and all its exercises?')) return;
    const updated = editTemplates.filter((_, i) => i !== index);
    // Fix order indices
    updated.forEach((wt, i) => (wt.order_index = i));
    setEditTemplates(updated);
  };

  const addExerciseToWorkout = (workoutIndex: number) => {
    const updated = [...editTemplates];
    updated[workoutIndex] = {
      ...updated[workoutIndex],
      exercises: [
        ...updated[workoutIndex].exercises,
        {
          exercise_id: exercises[0]?.id || 1,
          order_index: updated[workoutIndex].exercises.length,
          target_sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          starting_rir: 3,
          ending_rir: 0,
          notes: '',
        },
      ],
    };
    setEditTemplates(updated);
  };

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    field: keyof WorkoutExerciseCreate,
    value: string | number
  ) => {
    const updated = [...editTemplates];
    updated[workoutIndex] = {
      ...updated[workoutIndex],
      exercises: updated[workoutIndex].exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, [field]: value } : ex
      ),
    };
    setEditTemplates(updated);
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    const updated = [...editTemplates];
    updated[workoutIndex] = {
      ...updated[workoutIndex],
      exercises: updated[workoutIndex].exercises.filter((_, i) => i !== exerciseIndex),
    };
    setEditTemplates(updated);
  };

  const moveExercise = (workoutIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    const updated = [...editTemplates];
    const exercises = [...updated[workoutIndex].exercises];
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    [exercises[exerciseIndex], exercises[targetIndex]] = [exercises[targetIndex], exercises[exerciseIndex]];
    exercises.forEach((ex, i) => { ex.order_index = i; });
    updated[workoutIndex] = { ...updated[workoutIndex], exercises };
    setEditTemplates(updated);
  };

  const toggleDayCollapsed = (index: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Derive sorted muscle groups from loaded exercises
  const muscleGroups = [...new Set(exercises.map((ex) => ex.muscle_group))].sort();

  if (loading) {
    return <div className="p-8 text-gray-300 bg-gray-900 min-h-screen">Loading mesocycle template...</div>;
  }

  if (error || !mesocycle) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error || 'Mesocycle template not found'}
        </div>
        <button
          onClick={() => navigate('/mesocycles')}
          className="text-gray-400 hover:text-white transition border border-gray-600 rounded-lg p-2 hover:border-gray-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>
    );
  }

  const isStock = mesocycle.is_stock;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/mesocycles')}
                className="text-gray-400 hover:text-white transition border border-gray-600 rounded-lg p-2 hover:border-gray-400"
                title="Back to Mesocycles"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">{mesocycle.name}</h1>
            </div>
            {!isStock && !editing && (
              <div className="flex items-center gap-3">
                <button
                  onClick={startEditing}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  Edit Template
                </button>
                <button
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
            {editing && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mesocycle Info Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6 border border-gray-700">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Weeks (3-12) *</label>
                  <input
                    type="number"
                    min="3"
                    max="12"
                    value={editData.weeks}
                    onChange={(e) => setEditData({ ...editData, weeks: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Days/Week *</label>
                  <select
                    value={editData.days_per_week}
                    onChange={(e) => setEditData({ ...editData, days_per_week: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} day{n !== 1 ? 's' : ''} per week
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isStock && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                        Stock
                      </span>
                    )}
                    <span className="px-2 py-1 rounded text-xs font-medium bg-teal-900/50 text-teal-300">
                      Template
                    </span>
                  </div>
                </div>
              </div>

              {mesocycle.description && (
                <p className="text-gray-400 mb-4">{mesocycle.description}</p>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div>
                  <span className="text-sm text-gray-400">Duration</span>
                  <p className="text-lg font-semibold text-white">{mesocycle.weeks} weeks</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Days/Week</span>
                  <p className="text-lg font-semibold text-white">{mesocycle.days_per_week}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Workouts</span>
                  <p className="text-lg font-semibold text-white">
                    {mesocycle.workout_templates.length}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Workout Templates */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Workout Templates</h2>
            {editing && (
              <button
                type="button"
                onClick={addWorkoutTemplate}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                + Add Workout Day
              </button>
            )}
          </div>

          {editing ? (
            /* Edit mode - editable workout templates */
            editTemplates.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center text-gray-400 border border-gray-700">
                No workout templates. Click "+ Add Workout Day" to add one.
              </div>
            ) : (
              editTemplates.map((workout, dayIndex) => (
                <div key={dayIndex} className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                  {/* Collapsible header */}
                  <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-750 transition-colors" onClick={() => toggleDayCollapsed(dayIndex)}>
                    <div className="flex items-center gap-3">
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
                      <div>
                        <h3 className="text-lg font-semibold text-white">Day {dayIndex + 1}: {workout.name || 'Untitled'}</h3>
                        <p className="text-xs text-gray-400">{workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeWorkoutTemplate(dayIndex); }}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      Remove Day
                    </button>
                  </div>

                  {!collapsedDays.has(dayIndex) && (
                    <>
                      <div className="px-6 pb-4 border-t border-gray-700 pt-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Workout Name *</label>
                            <input
                              type="text"
                              value={workout.name}
                              onChange={(e) => updateWorkoutTemplate(dayIndex, 'name', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                            <textarea
                              value={workout.description || ''}
                              onChange={(e) => updateWorkoutTemplate(dayIndex, 'description', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-6 pb-6">
                        <span className="text-sm font-medium text-gray-300 mb-3 block">Exercises</span>

                        <div className="space-y-3">
                          {workout.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              className="border border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-700"
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
                                    value={exercises.find((ex) => ex.id === exercise.exercise_id)?.muscle_group || muscleGroups[0] || ''}
                                    onChange={(e) => {
                                      const group = e.target.value;
                                      const firstInGroup = exercises.find((ex) => ex.muscle_group === group);
                                      if (firstInGroup) {
                                        updateExercise(dayIndex, exerciseIndex, 'exercise_id', firstInGroup.id);
                                      }
                                    }}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                                      updateExercise(dayIndex, exerciseIndex, 'exercise_id', parseInt(e.target.value))
                                    }
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  >
                                    {exercises
                                      .filter(
                                        (ex) =>
                                          ex.muscle_group ===
                                          (exercises.find((e) => e.id === exercise.exercise_id)?.muscle_group)
                                      )
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
                                    placeholder="Add any notes..."
                                    value={exercise.notes || ''}
                                    onChange={(e) =>
                                      updateExercise(dayIndex, exerciseIndex, 'notes', e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  />
                                </div>
                                <p className="text-xs text-gray-400 italic">
                                  Sets, reps, and RIR will be automatically determined by the algorithm.
                                </p>
                              </div>
                            </div>
                          ))}

                          {workout.exercises.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">
                              No exercises yet. Click "+ Add Exercise" to add one.
                            </p>
                          )}

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
                    </>
                  )}
                </div>
              ))
            )
          ) : (
            /* View mode - read-only workout templates */
            mesocycle.workout_templates.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center text-gray-400 border border-gray-700">
                No workout templates defined
              </div>
            ) : (
              mesocycle.workout_templates.map((workout, index) => (
                <div key={workout.id} className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                  {/* Collapsible header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-750 transition-colors flex items-center justify-between"
                    onClick={() => toggleDayCollapsed(index)}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-gray-400 transition-transform ${collapsedDays.has(index) ? '' : 'rotate-180'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          Day {index + 1}: {workout.name}
                        </h3>
                        {workout.description && (
                          <p className="text-gray-400 text-sm">{workout.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {!collapsedDays.has(index) && (
                    <div className="px-6 pb-6 border-t border-gray-700 pt-4">
                      {workout.exercises.length === 0 ? (
                        <p className="text-gray-500 text-center">No exercises in this workout</p>
                      ) : (
                        <div className="space-y-4">
                          {workout.exercises.map((exercise, exIndex) => (
                            <div
                              key={exercise.id}
                              className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-white">
                                    {exIndex + 1}. {exercise.exercise.name}
                                  </h4>
                                  <p className="text-sm text-gray-400">
                                    {exercise.exercise.muscle_group}
                                    {exercise.exercise.equipment &&
                                      ` \u2022 ${exercise.exercise.equipment}`}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Sets</span>
                                  <p className="font-medium text-gray-200">{exercise.target_sets}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Reps</span>
                                  <p className="font-medium text-gray-200">
                                    {exercise.target_reps_min}-{exercise.target_reps_max}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Starting RIR</span>
                                  <p className="font-medium text-gray-200">{exercise.starting_rir}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Ending RIR</span>
                                  <p className="font-medium text-gray-200">{exercise.ending_rir}</p>
                                </div>
                              </div>

                              {exercise.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <span className="text-sm text-gray-500">Notes:</span>
                                  <p className="text-sm text-gray-300 mt-1">{exercise.notes}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </main>
    </div>
  );
}
