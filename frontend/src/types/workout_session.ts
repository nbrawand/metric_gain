/**
 * TypeScript types for WorkoutSession and WorkoutSet.
 */

import { Exercise } from './exercise';

/**
 * Workout set within a workout session
 */
export interface WorkoutSet {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  set_number: number;
  order_index: number;
  weight: number;
  reps: number;
  rir?: number;
  skipped: boolean; // True if user skipped this set
  target_weight?: number;
  target_reps?: number;
  target_rir?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  exercise?: Exercise; // Populated exercise details
}

/**
 * Data for creating a workout set
 */
export interface WorkoutSetCreate {
  exercise_id: number;
  set_number: number;
  order_index: number;
  weight: number;
  reps: number;
  rir?: number;
  target_weight?: number;
  target_reps?: number;
  target_rir?: number;
  notes?: string;
}

/**
 * Data for updating a workout set
 */
export interface WorkoutSetUpdate {
  exercise_id?: number;
  set_number?: number;
  order_index?: number;
  weight?: number;
  reps?: number;
  rir?: number;
  skipped?: boolean;
  target_weight?: number;
  target_reps?: number;
  target_rir?: number;
  notes?: string;
}

/**
 * Full workout session with nested sets
 */
export interface WorkoutSession {
  id: number;
  user_id: number;
  mesocycle_instance_id: number;
  workout_template_id: number;
  workout_date: string;
  week_number: number;
  day_number: number;
  status: 'in_progress' | 'completed' | 'skipped';
  duration_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  workout_sets: WorkoutSet[];
}

/**
 * Simplified workout session for list view (without sets)
 */
export interface WorkoutSessionListItem {
  id: number;
  user_id: number;
  mesocycle_instance_id: number;
  workout_template_id: number;
  workout_date: string;
  week_number: number;
  day_number: number;
  status: 'in_progress' | 'completed' | 'skipped';
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  set_count: number;
}

/**
 * Data for creating a new workout session
 */
export interface WorkoutSessionCreate {
  mesocycle_instance_id: number;
  workout_template_id: number;
  workout_date: string;
  week_number: number;
  day_number: number;
  duration_minutes?: number;
  notes?: string;
}

/**
 * Data for updating an existing workout session
 */
export interface WorkoutSessionUpdate {
  workout_date?: string;
  week_number?: number;
  day_number?: number;
  status?: 'in_progress' | 'completed' | 'skipped';
  duration_minutes?: number;
  notes?: string;
}
