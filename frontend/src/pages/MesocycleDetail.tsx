/**
 * Mesocycle detail page - View full mesocycle with workouts and exercises
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMesocycle, updateMesocycle, deleteMesocycle } from '../api/mesocycles';
import { useAuthStore } from '../stores/authStore';
import { Mesocycle } from '../types/mesocycle';

export default function MesocycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    status: 'planning' as 'planning' | 'active' | 'completed' | 'archived',
  });

  useEffect(() => {
    if (id) {
      loadMesocycle();
    }
  }, [id]);

  const loadMesocycle = async () => {
    if (!id || !accessToken) return;

    try {
      setLoading(true);
      const data = await getMesocycle(parseInt(id), accessToken);
      setMesocycle(data);
      setEditData({
        name: data.name,
        description: data.description || '',
        status: data.status,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load mesocycle');
      console.error('Error loading mesocycle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id || !mesocycle || !accessToken) return;

    try {
      await updateMesocycle(parseInt(id), editData, accessToken);
      setEditing(false);
      loadMesocycle();
    } catch (err) {
      alert('Failed to update mesocycle');
      console.error('Error updating mesocycle:', err);
    }
  };

  const handleDelete = async () => {
    if (!id || !accessToken || !confirm('Are you sure you want to delete this mesocycle?')) {
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
    return <div className="p-8">Loading mesocycle...</div>;
  }

  if (error || !mesocycle) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Mesocycle not found'}
        </div>
        <button
          onClick={() => navigate('/mesocycles')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Mesocycles
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/mesocycles')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            &larr; Back to Mesocycles
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        status: e.target.value as typeof editData.status,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{mesocycle.name}</h1>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        mesocycle.status
                      )}`}
                    >
                      {mesocycle.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {mesocycle.description && (
                  <p className="text-gray-600 mb-4">{mesocycle.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <span className="text-sm text-gray-600">Duration</span>
                    <p className="text-lg font-semibold text-gray-900">{mesocycle.weeks} weeks</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Workouts</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {mesocycle.workout_templates.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Exercises</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {mesocycle.workout_templates.reduce(
                        (sum, w) => sum + w.exercises.length,
                        0
                      )}
                    </p>
                  </div>
                </div>

                {(mesocycle.start_date || mesocycle.end_date) && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    {mesocycle.start_date && (
                      <div>
                        <span className="text-sm text-gray-600">Start Date</span>
                        <p className="text-gray-900">
                          {new Date(mesocycle.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {mesocycle.end_date && (
                      <div>
                        <span className="text-sm text-gray-600">End Date</span>
                        <p className="text-gray-900">
                          {new Date(mesocycle.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Workout Templates */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Workout Templates</h2>

          {mesocycle.workout_templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
              No workout templates defined
            </div>
          ) : (
            mesocycle.workout_templates.map((workout, index) => (
              <div key={workout.id} className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {index + 1}. {workout.name}
                      </h3>
                      {workout.description && (
                        <p className="text-gray-600">{workout.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {workout.exercises.length === 0 ? (
                    <p className="text-gray-600 text-center">No exercises in this workout</p>
                  ) : (
                    <div className="space-y-4">
                      {workout.exercises.map((exercise, exIndex) => (
                        <div
                          key={exercise.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {exIndex + 1}. {exercise.exercise.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {exercise.exercise.muscle_group}
                                {exercise.exercise.equipment &&
                                  ` • ${exercise.exercise.equipment}`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Sets</span>
                              <p className="font-medium text-gray-900">{exercise.target_sets}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Reps</span>
                              <p className="font-medium text-gray-900">
                                {exercise.target_reps_min}-{exercise.target_reps_max}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Starting RIR</span>
                              <p className="font-medium text-gray-900">{exercise.starting_rir}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Ending RIR</span>
                              <p className="font-medium text-gray-900">{exercise.ending_rir}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">RIR Progression</span>
                              <p className="font-medium text-gray-900">
                                {exercise.starting_rir} → {exercise.ending_rir}
                              </p>
                            </div>
                          </div>

                          {exercise.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <span className="text-sm text-gray-600">Notes:</span>
                              <p className="text-sm text-gray-900 mt-1">{exercise.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
