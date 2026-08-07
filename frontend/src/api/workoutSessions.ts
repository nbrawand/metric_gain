/**
 * API client for workout session management.
 * Uses the shared client.ts wrapper for automatic token refresh on 401.
 */

import { get, post, patch, del } from './client';
import {
  WorkoutSession,
  WorkoutSessionListItem,
  WorkoutSessionUpdate,
  WorkoutSet,
  WorkoutSetUpdate,
} from '../types/workout_session';

// Workout Session endpoints
export const listWorkoutSessions = async (
  filters: {
    mesocycle_instance_id?: number;
    status_filter?: string;
    skip?: number;
    limit?: number;
  },
  accessToken: string
): Promise<WorkoutSessionListItem[]> => {
  const params = new URLSearchParams();
  if (filters.mesocycle_instance_id) params.append('mesocycle_instance_id', filters.mesocycle_instance_id.toString());
  if (filters.status_filter) params.append('status_filter', filters.status_filter);
  if (filters.skip) params.append('skip', filters.skip.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return get<WorkoutSessionListItem[]>(`/v1/workout-sessions/?${params.toString()}`, accessToken);
};

export const getWorkoutSession = async (
  sessionId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return get<WorkoutSession>(`/v1/workout-sessions/${sessionId}`, accessToken);
};

export const updateWorkoutSession = async (
  sessionId: number,
  sessionUpdate: WorkoutSessionUpdate,
  accessToken: string
): Promise<WorkoutSession> => {
  return patch<WorkoutSession>(`/v1/workout-sessions/${sessionId}`, sessionUpdate, accessToken);
};

// Workout Set endpoints
export const updateWorkoutSet = async (
  sessionId: number,
  setId: number,
  setUpdate: WorkoutSetUpdate,
  accessToken: string
): Promise<WorkoutSet> => {
  return patch<WorkoutSet>(`/v1/workout-sessions/${sessionId}/sets/${setId}`, setUpdate, accessToken);
};

// Exercise Management endpoints (mid-workout swap/remove/add)
export const swapExercise = async (
  sessionId: number,
  oldExerciseId: number,
  newExerciseId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return post<WorkoutSession>(
    `/v1/workout-sessions/${sessionId}/exercises/swap`,
    { old_exercise_id: oldExerciseId, new_exercise_id: newExerciseId },
    accessToken
  );
};

export const removeExercise = async (
  sessionId: number,
  exerciseId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return del<WorkoutSession>(`/v1/workout-sessions/${sessionId}/exercises/${exerciseId}`, accessToken);
};

export const addExercise = async (
  sessionId: number,
  exerciseId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return post<WorkoutSession>(
    `/v1/workout-sessions/${sessionId}/exercises/add`,
    { exercise_id: exerciseId },
    accessToken
  );
};

// Per-exercise set add/remove endpoints
export const addSetToExercise = async (
  sessionId: number,
  exerciseId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return post<WorkoutSession>(
    `/v1/workout-sessions/${sessionId}/exercises/${exerciseId}/sets`,
    {},
    accessToken
  );
};

export const removeSetFromExercise = async (
  sessionId: number,
  exerciseId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  return del<WorkoutSession>(
    `/v1/workout-sessions/${sessionId}/exercises/${exerciseId}/sets`,
    accessToken
  );
};
