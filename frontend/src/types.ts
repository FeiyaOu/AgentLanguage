export interface Exercise {
  question: string;
  type: string;
  correct_answer: string;
  options?: string[];
}

export interface ScoreResult {
  total_score: string;
  score_percentage: number;
  detailed_scores: Array<{
    question_num: number;
    correct: boolean;
    feedback: string;
    question?: string;
    user_answer?: string;
    correct_answer?: string;
  }>;
  weak_areas: string[];
  recommendations: string;
  suggested_exercise_type?: string;
}

export interface SuggestedPersona {
  id: string;
  emoji: string;
  name: string;
  traits: string;
}

export interface Roleplay {
  roleplay_id: string;
  persona_name: string;
  persona_type: string;
  opening_line: string;
  scene_context: string;
  user_goal: string;
}

export interface RoleplayMessage {
  type: 'user' | 'persona' | 'coach';
  text: string;
  turn_count?: number;
  timestamp?: number;
  // Coach feedback fields
  politeness_score?: number;
  grammar_notes?: string[];
  vocab_suggestions?: string[];
  encouragement?: string;
  persona_resume?: string;
}
