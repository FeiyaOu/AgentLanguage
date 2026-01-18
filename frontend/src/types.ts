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
