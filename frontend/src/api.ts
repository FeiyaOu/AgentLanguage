import axios from 'axios';
import type { Exercise, ScoreResult, Roleplay, RoleplayMessage } from './types';

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

// Roleplay API functions
export const startRoleplay = async (
  topic: string,
  difficulty: string = 'beginner',
  personaType: string = 'friendly'
): Promise<Roleplay> => {
  const response = await api.post('/api/start-roleplay', {
    topic,
    difficulty,
    persona_type: personaType,
  });
  return response.data;
};

export const sendRoleplayMessage = async (
  roleplayId: string,
  userMessage: string,
  turnCount: number
): Promise<RoleplayMessage> => {
  const response = await api.post('/api/roleplay-message', {
    roleplay_id: roleplayId,
    user_message: userMessage,
    turn_count: turnCount,
  });
  
  const data = response.data;
  
  // Map response to RoleplayMessage format
  if (data.type === 'coach_feedback') {
    return {
      type: 'coach',
      text: data.encouragement || '',
      politeness_score: data.politeness_score,
      grammar_notes: data.grammar_notes,
      vocab_suggestions: data.vocab_suggestions,
      encouragement: data.encouragement,
      persona_resume: data.persona_resume,
      timestamp: Date.now(),
    };
  } else {
    return {
      type: 'persona',
      text: data.persona_response || '',
      timestamp: Date.now(),
    };
  }
};

export const endRoleplay = async (
  roleplayId: string
): Promise<{ final_message: string; total_turns: number }> => {
  const response = await api.post('/api/end-roleplay', {
    roleplay_id: roleplayId,
  });
  return response.data;
};
