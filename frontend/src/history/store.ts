import { useMemo, useSyncExternalStore } from 'react';
import type { Exercise } from '../types';
import type { ReviewItem } from '../results/ReviewList';

/*
 * Practice history for the mock account. Lives in localStorage, keyed by email,
 * standing in for what a backend would store per user.
 */

export type PracticeRecord = {
  id: string;
  topic: string;
  difficulty: string;
  createdAt: number;
  correct: number;
  total: number;
  weakAreas: string[];
  recommendations?: string;
  exercises: Exercise[];
  answers: string[];
  review: ReviewItem[];
};

const MAX_RECORDS = 50;
const CHANGE_EVENT = 'agentlanguage:history';
const keyFor = (email: string) => `agentlanguage.history.${email.toLowerCase()}`;

function readRaw(email: string): string {
  try {
    return localStorage.getItem(keyFor(email)) ?? '[]';
  } catch {
    return '[]';
  }
}

function parse(raw: string): PracticeRecord[] {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(email: string, records: PracticeRecord[]) {
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Storage full or unavailable: history is a convenience, never block the flow.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Insert or replace by id (so saving twice is harmless), newest first. */
export function saveRecord(email: string, record: PracticeRecord) {
  const others = parse(readRaw(email)).filter((r) => r.id !== record.id);
  write(email, [record, ...others].sort((a, b) => b.createdAt - a.createdAt));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange); // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The signed-in user's records, newest first; empty for guests. */
export function useHistory(email: string | undefined): PracticeRecord[] {
  // The snapshot is the raw string, so it's stable between unrelated renders.
  const raw = useSyncExternalStore(subscribe, () => (email ? readRaw(email) : '[]'));
  return useMemo(() => parse(raw), [raw]);
}

export type Mistake = { exercise: Exercise; topic: string; difficulty: string };

/**
 * Questions whose most recent attempt was wrong. Answering one correctly later
 * (e.g. in a mistakes review) takes it off the list.
 */
export function collectMistakes(records: PracticeRecord[]): Mistake[] {
  const latest = new Map<string, { correct: boolean; mistake: Mistake }>();
  for (const record of records) {
    // Records are newest first, so the first sighting of a question is its latest attempt.
    record.review.forEach((item, i) => {
      const exercise = record.exercises[i];
      if (!exercise || latest.has(exercise.question)) return;
      latest.set(exercise.question, {
        correct: item.correct,
        mistake: { exercise, topic: record.topic, difficulty: record.difficulty },
      });
    });
  }
  return [...latest.values()].filter((v) => !v.correct).map((v) => v.mistake);
}
