/**
 * Exercise type definitions
 */

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  muscle_group: string;
  equipment: string | null;
  is_custom: boolean;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseCreate {
  name: string;
  description?: string;
  muscle_group: string;
  equipment?: string;
}

export interface ExerciseUpdate {
  name?: string;
  description?: string;
  muscle_group?: string;
  equipment?: string;
}

export interface ExerciseListParams {
  muscle_group?: string;
  equipment?: string;
  search?: string;
  include_custom?: boolean;
  skip?: number;
  limit?: number;
}
