/**
 * API client for mesocycle template and instance endpoints.
 */

import { get, post, put, patch, del } from './client';
import type {
  Mesocycle,
  MesocycleListItem,
  MesocycleCreate,
  MesocycleUpdate,
  MesocycleInstance,
  MesocycleInstanceListItem,
  MesocycleInstanceCreate,
  MesocycleInstanceUpdate,
  WorkoutTemplate,
  WorkoutTemplateCreate,
} from '../types/mesocycle';

const MESOCYCLES_ENDPOINT = '/v1/mesocycles';
const INSTANCES_ENDPOINT = '/v1/mesocycle-instances';

/**
 * Get list of user's mesocycles (simplified, without nested templates)
 */
export async function listMesocycles(accessToken: string): Promise<MesocycleListItem[]> {
  return get<MesocycleListItem[]>(`${MESOCYCLES_ENDPOINT}/`, accessToken);
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
  return post<Mesocycle>(`${MESOCYCLES_ENDPOINT}/`, data, accessToken);
}

/**
 * Create a new mesocycle template from a completed instance
 */
export async function createMesocycleFromInstance(instanceId: number, accessToken: string): Promise<Mesocycle> {
  return post<Mesocycle>(`${MESOCYCLES_ENDPOINT}/from-instance/${instanceId}`, {}, accessToken);
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

/**
 * Replace all workout templates for a mesocycle
 */
export async function replaceWorkoutTemplates(
  mesocycleId: number,
  templates: WorkoutTemplateCreate[],
  accessToken: string
): Promise<Mesocycle> {
  return put<Mesocycle>(
    `${MESOCYCLES_ENDPOINT}/${mesocycleId}/workout-templates`,
    templates,
    accessToken
  );
}

/**
 * Update exercise notes on a mesocycle instance (not the template)
 */
export async function updateInstanceExerciseNotes(
  instanceId: number,
  workoutExerciseId: number,
  notes: string,
  accessToken: string
): Promise<Record<string, string>> {
  return patch<Record<string, string>>(
    `${INSTANCES_ENDPOINT}/${instanceId}/exercise-notes`,
    { workout_exercise_id: workoutExerciseId, notes },
    accessToken
  );
}

// ============================================
// Mesocycle Instance Functions
// ============================================

/**
 * Get list of user's mesocycle instances
 */
export async function listMesocycleInstances(
  statusFilter?: string,
  accessToken?: string
): Promise<MesocycleInstanceListItem[]> {
  const url = statusFilter
    ? `${INSTANCES_ENDPOINT}/?status_filter=${statusFilter}`
    : `${INSTANCES_ENDPOINT}/`;
  return get<MesocycleInstanceListItem[]>(url, accessToken!);
}

/**
 * Get active mesocycle instance
 */
export async function getActiveMesocycleInstance(accessToken: string): Promise<MesocycleInstance> {
  return get<MesocycleInstance>(`${INSTANCES_ENDPOINT}/active`, accessToken);
}

/**
 * Get specific mesocycle instance
 */
export async function getMesocycleInstance(id: number, accessToken: string): Promise<MesocycleInstance> {
  return get<MesocycleInstance>(`${INSTANCES_ENDPOINT}/${id}`, accessToken);
}

/**
 * Start a new mesocycle instance from a template
 */
export async function startMesocycleInstance(
  data: MesocycleInstanceCreate,
  accessToken: string
): Promise<MesocycleInstance> {
  return post<MesocycleInstance>(`${INSTANCES_ENDPOINT}/`, data, accessToken);
}

/**
 * Update mesocycle instance (e.g., mark as completed)
 */
export async function updateMesocycleInstance(
  id: number,
  data: MesocycleInstanceUpdate,
  accessToken: string
): Promise<MesocycleInstance> {
  return patch<MesocycleInstance>(`${INSTANCES_ENDPOINT}/${id}`, data, accessToken);
}

/**
 * Delete a mesocycle instance
 */
export async function deleteMesocycleInstance(id: number, accessToken: string): Promise<void> {
  return del<void>(`${INSTANCES_ENDPOINT}/${id}`, accessToken);
}
