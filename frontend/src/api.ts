import axios from 'axios';
import type { Exercise, ScoreResult } from './types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generatePractice = async (
  topic: string,
  difficulty: string = 'beginner',
  focusAreas: string[] = []
): Promise<{ exercises: Exercise[]; message: string }> => {
  const response = await api.post('/api/generate-practice', {
    topic,
    difficulty,
    focus_areas: focusAreas,
  });
  return response.data;
};

export const scoreAnswers = async (
  exercises: Exercise[],
  answers: string[]
): Promise<ScoreResult> => {
  const response = await api.post('/api/score-answers', {
    exercises,
    answers,
  });
  return response.data;
};

export const askTutor = async (
  question: string,
  context?: Record<string, any>
): Promise<{ answer: string }> => {
  const response = await api.post('/api/ask-tutor', {
    question,
    context,
  });
  return response.data;
};

export const resetSession = async (): Promise<void> => {
  await api.post('/api/reset');
};
