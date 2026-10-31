import type { Exercise } from '../types';

/*
 * Client-side grading for instant feedback. Mirrors the deterministic checks in
 * backend/main.py (score_answers), so the instant verdict and the final score agree.
 */

const norm = (text: string) => text.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');

const normSentence = (text: string) =>
  norm(text)
    .replace(/[^\w\s']+/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');

export function isCorrect(exercise: Exercise, answer: string) {
  if (!exercise.correct_answer) return false;
  return exercise.type === 'sentence_reordering'
    ? normSentence(answer) === normSentence(exercise.correct_answer)
    : norm(answer) === norm(exercise.correct_answer);
}

export const TYPE_PROMPT: Record<string, string> = {
  multiple_choice: 'Choose the best answer',
  banked_cloze: 'Fill in the blank',
  sentence_reordering: 'Put the words in order',
};
