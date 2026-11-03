import type { NavigateFunction } from 'react-router-dom';
import type { Mistake } from './store';

const MAX_REVIEW_QUESTIONS = 10;

/** "Today, 14:05", "Yesterday", or "3 Nov". */
export function formatWhen(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const dayDiff = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000,
  );
  if (dayDiff === 0) return `Today, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (dayDiff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Starts a practice session made of saved mistakes — no generation needed. */
export function startMistakesReview(navigate: NavigateFunction, mistakes: Mistake[], topic = 'Mistakes review') {
  const picked = mistakes.slice(0, MAX_REVIEW_QUESTIONS);
  if (!picked.length) return;
  navigate('/practice/session', {
    state: { topic, difficulty: picked[0].difficulty, exercises: picked.map((m) => m.exercise) },
  });
}
