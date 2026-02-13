import axios from 'axios';
import type { Exercise, ScoreResult, Roleplay, RoleplayMessage, SuggestedPersona } from './types';

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
  context?: Record<string, any>,
  history: { role: string; content: string }[] = []
): Promise<{ answer: string }> => {
  const response = await api.post('/api/ask-tutor', {
    question,
    context,
    history,
  });
  return response.data;
};

export const resetSession = async (): Promise<void> => {
  await api.post('/api/reset');
};

// Suggest personas for a scenario
export const suggestPersonas = async (
  scenario: string,
  difficulty: string = 'beginner'
): Promise<SuggestedPersona[]> => {
  const response = await api.post('/api/suggest-personas', {
    scenario,
    difficulty,
  });
  return response.data.personas;
};

// Roleplay API functions
export const startRoleplay = async (
  topic: string,
  difficulty: string = 'beginner',
  personaType: string = 'friendly',
  customDescription?: string
): Promise<Roleplay> => {
  const response = await api.post('/api/start-roleplay', {
    topic,
    difficulty,
    persona_type: personaType,
    custom_description: customDescription,
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
  if (data.type === 'session_end') {
    return {
      type: 'system',
      text: data.final_message || 'Session ended.',
      goal_progress: data.goal_progress,
      goal_status: data.goal_status,
      achieved: data.achieved,
      turns_remaining: data.turns_remaining,
      session_over: data.session_over,
      final_message: data.final_message,
      timestamp: Date.now(),
    };
  }

  if (data.type === 'coach_feedback') {
    return {
      type: 'coach',
      text: data.encouragement || '',
      goal_progress: data.goal_progress,
      goal_status: data.goal_status,
      achieved: data.achieved,
      turns_remaining: data.turns_remaining,
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
      goal_progress: data.goal_progress,
      goal_status: data.goal_status,
      achieved: data.achieved,
      turns_remaining: data.turns_remaining,
      timestamp: Date.now(),
    };
  }
};

export const getRoleplayHint = async (
  roleplayId: string,
  turnCount: number
): Promise<RoleplayMessage> => {
  const response = await api.post('/api/roleplay-message', {
    roleplay_id: roleplayId,
    user_message: '',
    turn_count: turnCount,
    mode: 'hint',
    consume_turn: false,
  });

  const data = response.data;

  // Hint is returned as coach_feedback
  return {
    type: 'coach',
    text: data.encouragement || '',
    goal_progress: data.goal_progress,
    goal_status: data.goal_status,
    achieved: data.achieved,
    turns_remaining: data.turns_remaining,
    politeness_score: data.politeness_score,
    grammar_notes: data.grammar_notes,
    vocab_suggestions: data.vocab_suggestions,
    encouragement: data.encouragement,
    persona_resume: data.persona_resume,
    timestamp: Date.now(),
  };
};

export const endRoleplay = async (
  roleplayId: string
): Promise<{ final_message: string; total_turns: number }> => {
  const response = await api.post('/api/end-roleplay', {
    roleplay_id: roleplayId,
  });
  return response.data;
};
