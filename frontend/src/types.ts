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
  }>;
  weak_areas: string[];
  recommendations: string;
}
