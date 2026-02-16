/**
 * Exercise Library page
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getExercises, getMuscleGroups, createExercise, deleteExercise } from '../api/exercises';
import type { Exercise, ExerciseCreate } from '../types/exercise';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';

export function Exercises() {
  const { accessToken } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [showCustomOnly, setShowCustomOnly] = useState(false);

  // Create exercise modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<ExerciseCreate>({
    name: '',
    description: '',
    muscle_group: '',
    equipment: '',
  });

  // Load exercises and muscle groups
  useEffect(() => {
    loadData();
  }, [searchTerm, selectedMuscleGroup, showCustomOnly]);

  const loadData = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const [exercisesData, muscleGroupsData] = await Promise.all([
        getExercises(
          {
            search: searchTerm || undefined,
            muscle_group: selectedMuscleGroup || undefined,
            include_custom: !showCustomOnly,
            limit: 500,
          },
          accessToken
        ),
        getMuscleGroups(accessToken),
      ]);

      setExercises(showCustomOnly ? exercisesData.filter((e) => e.is_custom) : exercisesData);
      setMuscleGroups(muscleGroupsData);
    } catch (err: any) {
      setError(err.detail || 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setIsCreating(true);
    setError(null);

    try {
      await createExercise(createFormData, accessToken);
      setShowCreateModal(false);
      setCreateFormData({ name: '', description: '', muscle_group: '', equipment: '' });
      loadData(); // Reload exercises
    } catch (err: any) {
      setError(err.detail || 'Failed to create exercise');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to delete this custom exercise?')) return;

    try {
      await deleteExercise(exerciseId, accessToken);
      loadData(); // Reload exercises
    } catch (err: any) {
      setError(err.detail || 'Failed to delete exercise');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">Exercise Library</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                + Create Custom Exercise
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Muscle Group Filter */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Muscle Group
              </label>
              <select
                value={selectedMuscleGroup}
                onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Muscle Groups</option>
                {muscleGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Custom Only */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Filter
              </label>
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={showCustomOnly}
                  onChange={(e) => setShowCustomOnly(e.target.checked)}
                  className="mr-2"
                />
                Show Custom Exercises Only
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Exercise List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading exercises...</div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No exercises found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{exercise.name}</h3>
                  {exercise.is_custom && (
                    <button
                      onClick={() => handleDeleteExercise(exercise.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded">
                    {exercise.muscle_group}
                  </span>
                  {exercise.is_custom && (
                    <span className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded">
                      Custom
                    </span>
                  )}
                </div>

                {exercise.equipment && (
                  <p className="text-gray-400 text-sm mb-2">
                    Equipment: {exercise.equipment}
                  </p>
                )}

                {exercise.description && (
                  <p className="text-gray-300 text-sm">{exercise.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Exercise Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Create Custom Exercise</h2>

            <form onSubmit={handleCreateExercise}>
              <FormInput
                id="name"
                name="name"
                label="Exercise Name"
                placeholder="e.g., My Custom Press"
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
                }
                required
              />

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="muscle_group">
                  Muscle Group
                </label>
                <select
                  id="muscle_group"
                  name="muscle_group"
                  value={createFormData.muscle_group}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, muscle_group: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a muscle group</option>
                  {muscleGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="equipment">
                  Equipment (Optional)
                </label>
                <select
                  id="equipment"
                  name="equipment"
                  value={createFormData.equipment}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, equipment: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select equipment (optional)</option>
                  <option value="Barbell">Barbell</option>
                  <option value="Dumbbells">Dumbbells</option>
                  <option value="Cable Machine">Cable Machine</option>
                  <option value="Machine">Machine</option>
                  <option value="Bodyweight">Bodyweight</option>
                  <option value="Resistance Bands">Resistance Bands</option>
                  <option value="Kettlebell">Kettlebell</option>
                  <option value="Pull-up Bar">Pull-up Bar</option>
                  <option value="Parallel Bars">Parallel Bars</option>
                  <option value="Medicine Ball">Medicine Ball</option>
                  <option value="Smith Machine">Smith Machine</option>
                  <option value="TRX/Suspension">TRX/Suspension</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the exercise..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" isLoading={isCreating} className="flex-1">
                  Create Exercise
                </Button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
