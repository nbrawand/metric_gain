/**
 * API client for mesocycle endpoints.
 */

import apiClient from './client';
import {
  Mesocycle,
  MesocycleListItem,
  MesocycleCreate,
  MesocycleUpdate,
  WorkoutTemplate,
  WorkoutTemplateCreate,
} from '../types/mesocycle';

const MESOCYCLES_ENDPOINT = '/v1/mesocycles';

/**
 * Get list of user's mesocycles (simplified, without nested templates)
 */
export async function listMesocycles(): Promise<MesocycleListItem[]> {
  return apiClient.get<MesocycleListItem[]>(MESOCYCLES_ENDPOINT);
}

/**
 * Get specific mesocycle with full details (including workouts and exercises)
 */
export async function getMesocycle(id: number): Promise<Mesocycle> {
  return apiClient.get<Mesocycle>(`${MESOCYCLES_ENDPOINT}/${id}`);
}

/**
 * Create a new mesocycle with workout templates and exercises
 */
export async function createMesocycle(data: MesocycleCreate): Promise<Mesocycle> {
  return apiClient.post<Mesocycle>(MESOCYCLES_ENDPOINT, data);
}

/**
 * Update mesocycle details (not including workouts/exercises)
 */
export async function updateMesocycle(id: number, data: MesocycleUpdate): Promise<Mesocycle> {
  return apiClient.put<Mesocycle>(`${MESOCYCLES_ENDPOINT}/${id}`, data);
}

/**
 * Delete a mesocycle and all associated workouts and exercises
 */
export async function deleteMesocycle(id: number): Promise<void> {
  return apiClient.delete<void>(`${MESOCYCLES_ENDPOINT}/${id}`);
}

/**
 * Add a workout template to an existing mesocycle
 */
export async function addWorkoutTemplate(
  mesocycleId: number,
  data: WorkoutTemplateCreate
): Promise<WorkoutTemplate> {
  return apiClient.post<WorkoutTemplate>(
    `${MESOCYCLES_ENDPOINT}/${mesocycleId}/workout-templates`,
    data
  );
}
