/**
 * Exercise API client
 */

import { get, post, put, del } from './client';
import type {
  Exercise,
  ExerciseCreate,
  ExerciseUpdate,
  ExerciseListParams,
} from '../types/exercise';

const EXERCISES_BASE = '/v1/exercises';

/**
 * Get list of exercises with optional filters
 */
export async function getExercises(
  params: ExerciseListParams,
  accessToken: string
): Promise<Exercise[]> {
  // Build query string from params
  const queryParams = new URLSearchParams();

  if (params.muscle_group) queryParams.append('muscle_group', params.muscle_group);
  if (params.equipment) queryParams.append('equipment', params.equipment);
  if (params.search) queryParams.append('search', params.search);
  if (params.include_custom !== undefined)
    queryParams.append('include_custom', params.include_custom.toString());
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${EXERCISES_BASE}/?${queryString}` : `${EXERCISES_BASE}/`;

  return get<Exercise[]>(url, accessToken);
}

/**
 * Get list of muscle groups
 */
export async function getMuscleGroups(accessToken: string): Promise<string[]> {
  return get<string[]>(`${EXERCISES_BASE}/muscle-groups`, accessToken);
}

/**
 * Get a specific exercise by ID
 */
export async function getExercise(
  exerciseId: number,
  accessToken: string
): Promise<Exercise> {
  return get<Exercise>(`${EXERCISES_BASE}/${exerciseId}`, accessToken);
}

/**
 * Create a custom exercise
 */
export async function createExercise(
  data: ExerciseCreate,
  accessToken: string
): Promise<Exercise> {
  return post<Exercise>(`${EXERCISES_BASE}/`, data, accessToken);
}

/**
 * Update a custom exercise
 */
export async function updateExercise(
  exerciseId: number,
  data: ExerciseUpdate,
  accessToken: string
): Promise<Exercise> {
  return put<Exercise>(`${EXERCISES_BASE}/${exerciseId}`, data, accessToken);
}

/**
 * Delete a custom exercise
 */
export async function deleteExercise(
  exerciseId: number,
  accessToken: string
): Promise<void> {
  return del<void>(`${EXERCISES_BASE}/${exerciseId}`, accessToken);
}
