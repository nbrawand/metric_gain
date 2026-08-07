/**
 * Analytics API client, reading training history back.
 */

import { get } from './client';

export interface TrainingOverview {
  sessions_completed: number;
  sets_logged: number;
  blocks_completed: number;
  total_reps: number;
  total_volume: number;
  training_since: string | null;
  weight_unit: string;
}

export interface StrengthPoint {
  date: string;
  estimated_1rm: number;
  weight: number;
  reps: number;
  rir: number | null;
}

export interface StrengthHistory {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  weight_unit: string;
  points: StrengthPoint[];
}

export interface VolumeHistory {
  weeks: string[];
  muscle_groups: string[];
  sets: Record<string, number[]>;
}

export interface PersonalRecord {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  best_estimated_1rm: number | null;
  best_estimated_1rm_date: string | null;
  heaviest_weight: number | null;
  heaviest_weight_reps: number | null;
  heaviest_weight_date: string | null;
}

export interface TrainedExercise {
  id: number;
  name: string;
  muscle_group: string;
}

export const getOverview = (token: string) =>
  get<TrainingOverview>('/v1/analytics/overview', token);

export const getStrengthHistory = (exerciseId: number, token: string) =>
  get<StrengthHistory>(`/v1/analytics/strength/${exerciseId}`, token);

export const getVolumeHistory = (token: string, weeks = 12) =>
  get<VolumeHistory>(`/v1/analytics/volume?weeks=${weeks}`, token);

export const getPersonalRecords = (token: string) =>
  get<{ weight_unit: string; records: PersonalRecord[] }>('/v1/analytics/records', token);

export const getTrainedExercises = (token: string) =>
  get<TrainedExercise[]>('/v1/analytics/trained-exercises', token);
