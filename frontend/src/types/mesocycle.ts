/**
 * TypeScript types for Mesocycle, WorkoutTemplate, and WorkoutExercise.
 */

import { Exercise } from './exercise';

/**
 * Workout exercise within a workout template
 */
export interface WorkoutExercise {
  id: number;
  workout_template_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  starting_rir: number;
  ending_rir: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  exercise: Exercise; // Populated exercise details
}

/**
 * Data for creating a workout exercise
 */
export interface WorkoutExerciseCreate {
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  starting_rir: number;
  ending_rir: number;
  notes?: string;
}

/**
 * Workout template within a mesocycle
 */
export interface WorkoutTemplate {
  id: number;
  mesocycle_id: number;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  exercises: WorkoutExercise[];
}

/**
 * Data for creating a workout template
 */
export interface WorkoutTemplateCreate {
  name: string;
  description?: string;
  order_index: number;
  exercises: WorkoutExerciseCreate[];
}

/**
 * Full mesocycle TEMPLATE with nested workouts and exercises
 */
export interface Mesocycle {
  id: number;
  user_id: number | null; // Nullable for stock mesocycles
  is_stock: boolean;
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  created_at: string;
  updated_at: string;
  workout_templates: WorkoutTemplate[];
}

/**
 * Simplified mesocycle template for list view (without nested templates)
 */
export interface MesocycleListItem {
  id: number;
  user_id: number | null; // Nullable for stock mesocycles
  is_stock: boolean;
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  created_at: string;
  updated_at: string;
  workout_count: number;
}

/**
 * Data for creating a new mesocycle template
 */
export interface MesocycleCreate {
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  workout_templates: WorkoutTemplateCreate[];
}

/**
 * Data for updating an existing mesocycle template
 */
export interface MesocycleUpdate {
  name?: string;
  description?: string;
  weeks?: number;
  days_per_week?: number;
}

// ============================================
// Mesocycle Instance Types
// ============================================

/**
 * Active mesocycle instance (created from a template)
 */
export interface MesocycleInstance {
  id: number;
  user_id: number;
  mesocycle_template_id: number | null;
  status: 'active' | 'completed' | 'abandoned';
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  template_name: string | null;
  template_weeks: number | null;
  template_days_per_week: number | null;
  exercise_notes?: Record<string, string>;
  mesocycle_template: Mesocycle | null; // Null if template was deleted
}

/**
 * Simplified mesocycle instance for list view
 */
export interface MesocycleInstanceListItem {
  id: number;
  user_id: number;
  mesocycle_template_id: number | null;
  status: 'active' | 'completed' | 'abandoned';
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  template_name: string;
  template_weeks: number;
  template_days_per_week: number;
}

/**
 * Data for starting a new mesocycle instance
 */
export interface MesocycleInstanceCreate {
  mesocycle_template_id: number;
  start_date?: string;
}

/**
 * Data for updating a mesocycle instance
 */
export interface MesocycleInstanceUpdate {
  status?: 'active' | 'completed' | 'abandoned';
}
