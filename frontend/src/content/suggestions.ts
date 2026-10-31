/** Tap-to-start suggestions, so learners don't face an empty text box. */

export const PRACTICE_TOPICS = [
  'Ordering at a café',
  'Job interviews',
  'Small talk at work',
  'Booking a hotel',
  'Phrasal verbs',
  'Making complaints',
];

export const ROLEPLAY_SCENARIOS = [
  'Checking into a hotel',
  'Returning an item',
  'Asking for directions',
  "Doctor's appointment",
  'Job interview',
  'Ordering at a restaurant',
];

export const LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Simple vocabulary, short sentences' },
  { value: 'intermediate', label: 'Intermediate', description: 'Natural phrasing, more grammar' },
  { value: 'advanced', label: 'Advanced', description: 'Idioms, nuance, faster pace' },
] as const;

export type Level = (typeof LEVELS)[number]['value'];
