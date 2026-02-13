export interface Exercise {
  question: string;
  type: string;
  correct_answer: string;
  options?: string[];
  tokens?: string[];
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
  max_turns?: number;
}

export interface RoleplayMessage {
  type: 'user' | 'persona' | 'coach' | 'system';
  text: string;
  turn_count?: number;
  timestamp?: number;
  // Game state fields (optional for backward compatibility)
  goal_progress?: number;
  goal_status?: 'in_progress' | 'off_track' | 'achieved';
  achieved?: boolean;
  turns_remaining?: number;
  session_over?: boolean;
  final_message?: string;
  // Coach feedback fields
  politeness_score?: number;
  grammar_notes?: string[];
  vocab_suggestions?: string[];
  encouragement?: string;
  persona_resume?: string;
}
