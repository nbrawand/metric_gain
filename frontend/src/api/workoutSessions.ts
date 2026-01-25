/**
 * API client for workout session management.
 */

import axios from 'axios';
import {
  WorkoutSession,
  WorkoutSessionListItem,
  WorkoutSessionCreate,
  WorkoutSessionUpdate,
  WorkoutSet,
  WorkoutSetCreate,
  WorkoutSetUpdate,
} from '../types/workout_session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Workout Session endpoints
export const createWorkoutSession = async (
  sessionData: WorkoutSessionCreate,
  accessToken: string
): Promise<WorkoutSession> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/workout-sessions/`,
    sessionData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
};

export const listWorkoutSessions = async (
  filters: {
    mesocycle_instance_id?: number;
    status_filter?: string;
    skip?: number;
    limit?: number;
  },
  accessToken: string
): Promise<WorkoutSessionListItem[]> => {
  const params = new URLSearchParams();
  if (filters.mesocycle_instance_id) params.append('mesocycle_instance_id', filters.mesocycle_instance_id.toString());
  if (filters.status_filter) params.append('status_filter', filters.status_filter);
  if (filters.skip) params.append('skip', filters.skip.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await axios.get(`${API_BASE_URL}/v1/workout-sessions/?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export const getWorkoutSession = async (
  sessionId: number,
  accessToken: string
): Promise<WorkoutSession> => {
  const response = await axios.get(`${API_BASE_URL}/v1/workout-sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export const updateWorkoutSession = async (
  sessionId: number,
  sessionUpdate: WorkoutSessionUpdate,
  accessToken: string
): Promise<WorkoutSession> => {
  const response = await axios.patch(
    `${API_BASE_URL}/v1/workout-sessions/${sessionId}`,
    sessionUpdate,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
};

export const deleteWorkoutSession = async (
  sessionId: number,
  accessToken: string
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/v1/workout-sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

// Workout Set endpoints
export const addWorkoutSet = async (
  sessionId: number,
  setData: WorkoutSetCreate,
  accessToken: string
): Promise<WorkoutSet> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/workout-sessions/${sessionId}/sets`,
    setData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
};

export const listWorkoutSets = async (
  sessionId: number,
  accessToken: string
): Promise<WorkoutSet[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/workout-sessions/${sessionId}/sets`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export const updateWorkoutSet = async (
  sessionId: number,
  setId: number,
  setUpdate: WorkoutSetUpdate,
  accessToken: string
): Promise<WorkoutSet> => {
  const response = await axios.patch(
    `${API_BASE_URL}/v1/workout-sessions/${sessionId}/sets/${setId}`,
    setUpdate,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
};

export const deleteWorkoutSet = async (
  sessionId: number,
  setId: number,
  accessToken: string
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/v1/workout-sessions/${sessionId}/sets/${setId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
