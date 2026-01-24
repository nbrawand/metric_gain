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
 * Full mesocycle with nested workouts and exercises
 */
export interface Mesocycle {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  start_date?: string;
  end_date?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  workout_templates: WorkoutTemplate[];
}

/**
 * Simplified mesocycle for list view (without nested templates)
 */
export interface MesocycleListItem {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  start_date?: string;
  end_date?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  workout_count: number;
}

/**
 * Data for creating a new mesocycle
 */
export interface MesocycleCreate {
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  start_date?: string;
  end_date?: string;
  workout_templates: WorkoutTemplateCreate[];
}

/**
 * Data for updating an existing mesocycle
 */
export interface MesocycleUpdate {
  name?: string;
  description?: string;
  weeks?: number;
  days_per_week?: number;
  start_date?: string;
  end_date?: string;
  status?: 'planning' | 'active' | 'completed' | 'archived';
}
