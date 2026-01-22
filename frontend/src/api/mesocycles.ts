/**
 * API client for mesocycle endpoints.
 */

import { get, post, put, del } from './client';
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
export async function listMesocycles(accessToken: string): Promise<MesocycleListItem[]> {
  return get<MesocycleListItem[]>(MESOCYCLES_ENDPOINT, accessToken);
}

/**
 * Get specific mesocycle with full details (including workouts and exercises)
 */
export async function getMesocycle(id: number, accessToken: string): Promise<Mesocycle> {
  return get<Mesocycle>(`${MESOCYCLES_ENDPOINT}/${id}`, accessToken);
}

/**
 * Create a new mesocycle with workout templates and exercises
 */
export async function createMesocycle(data: MesocycleCreate, accessToken: string): Promise<Mesocycle> {
  return post<Mesocycle>(MESOCYCLES_ENDPOINT, data, accessToken);
}

/**
 * Update mesocycle details (not including workouts/exercises)
 */
export async function updateMesocycle(id: number, data: MesocycleUpdate, accessToken: string): Promise<Mesocycle> {
  return put<Mesocycle>(`${MESOCYCLES_ENDPOINT}/${id}`, data, accessToken);
}

/**
 * Delete a mesocycle and all associated workouts and exercises
 */
export async function deleteMesocycle(id: number, accessToken: string): Promise<void> {
  return del<void>(`${MESOCYCLES_ENDPOINT}/${id}`, accessToken);
}

/**
 * Add a workout template to an existing mesocycle
 */
export async function addWorkoutTemplate(
  mesocycleId: number,
  data: WorkoutTemplateCreate,
  accessToken: string
): Promise<WorkoutTemplate> {
  return post<WorkoutTemplate>(
    `${MESOCYCLES_ENDPOINT}/${mesocycleId}/workout-templates`,
    data,
    accessToken
  );
}
