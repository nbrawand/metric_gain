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
  skipped: number; // 0 = not skipped, 1 = skipped
  target_weight?: number;
  target_reps?: number;
  target_rir?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  exercise?: Exercise; // Populated exercise details
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
  skipped?: number; // 0 = not skipped, 1 = skipped (integer for PostgreSQL compatibility)
  target_weight?: number;
  target_reps?: number;
  target_rir?: number;
  notes?: string;
}

/**
 * Full workout session with nested sets
 */
export interface VolumeAdjustment {
  exercise_id: number;
  /** +1, 0 or -1 sets for next week. 0 with capped=true means it was earned but the muscle group is at its weekly limit. */
  delta: number;
  from_sets: number;
  to_sets: number;
  capped: boolean;
}

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
  /**
   * How many later weeks of this same day an exercise add/remove/swap also
   * changed. Only present on those responses.
   */
  future_sessions_updated?: number | null;
  /**
   * Set-count changes autoregulation made to next week off this session's
   * performance. Only present when completing a session.
   */
  volume_adjustments?: VolumeAdjustment[] | null;
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
