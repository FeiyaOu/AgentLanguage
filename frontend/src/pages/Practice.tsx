import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useAnimationControls } from 'framer-motion';
import type { Exercise } from '../types';
import { generatePractice, scoreAnswers } from '../api';
import { FocusHeader } from '../components/FocusHeader';
import { Button, EmptyState, SegmentedProgress, toast, type SegmentState } from '../ui';
import { isCorrect, TYPE_PROMPT } from '../practice/grade';
import { ChoiceQuestion } from '../practice/ChoiceQuestion';
import { ReorderQuestion, type ReorderBoard, type Token } from '../practice/ReorderQuestion';
import { FeedbackBar } from '../practice/FeedbackBar';
import { GeneratingState } from '../practice/GeneratingState';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type PracticeState = {
  topic: string;
  difficulty: string;
  focusAreas?: string[];
  /** Ready-made questions (e.g. a mistakes review); skips generation. */
  exercises?: Exercise[];
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBoard(exercise: Exercise): ReorderBoard {
  const provided = (exercise.tokens ?? []).filter(Boolean);
  const words = provided.length
    ? provided
    : shuffle(exercise.correct_answer.replace(/[.!?]+$/g, '').split(/\s+/).filter(Boolean));
  return { available: words.map((text, id) => ({ id, text })), selected: [] };
}

const boardsFor = (exercises: Exercise[]): Record<number, ReorderBoard> =>
  Object.fromEntries(exercises.flatMap((ex, i) => (ex.type === 'sentence_reordering' ? [[i, buildBoard(ex)]] : [])));

export default function Practice() {
  const location = useLocation();
  const state = location.state as PracticeState | null;
  // Session config only exists in router state; after a refresh, start over.
  if (!state?.topic) return <Navigate to="/practice" replace />;
  return <PracticeSession {...state} />;
}

function PracticeSession({ topic, difficulty, focusAreas, exercises: provided }: PracticeState) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>(provided ?? []);
  const [generating, setGenerating] = useState(!provided?.length);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => (provided ?? []).map(() => ''));
  const [verdicts, setVerdicts] = useState<(boolean | null)[]>(() => (provided ?? []).map(() => null));
  const [boards, setBoards] = useState<Record<number, ReorderBoard>>(() => boardsFor(provided ?? []));
  const [submitting, setSubmitting] = useState(false);
  const shake = useAnimationControls();
  const questionRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  // State updates happen only in the request callbacks; the initial state already says "generating".
  const fetchExercises = useCallback(() => {
    generatePractice(topic, difficulty, focusAreas ?? [])
      .then(({ exercises }) => {
        setExercises(exercises);
        setAnswers(exercises.map(() => ''));
        setVerdicts(exercises.map(() => null));
        setBoards(boardsFor(exercises));
        setIndex(0);
      })
      .catch(() => setLoadError(true))
      .finally(() => setGenerating(false));
  }, [topic, difficulty, focusAreas]);

  useEffect(() => {
    // Guard against StrictMode's double effect, which would generate twice.
    if (fetched.current || provided?.length) return;
    fetched.current = true;
    fetchExercises();
  }, [fetchExercises, provided]);

  const retry = () => {
    setGenerating(true);
    setLoadError(false);
    fetchExercises();
  };

  const exercise = exercises[index];
  const answer = answers[index] ?? '';
  const verdict = verdicts[index] ?? null;
  const isLast = index === exercises.length - 1;
  const board = boards[index];
  const isReorder = exercise?.type === 'sentence_reordering';
  const canCheck = isReorder ? !!board && board.available.length === 0 && board.selected.length > 0 : !!answer;

  // Move focus to each new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    questionRef.current?.querySelector<HTMLElement>('[data-question-heading]')?.focus();
  }, [index]);

  const setAnswer = (value: string) =>
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));

  const moveToken = (token: Token, toSelected: boolean) => {
    if (!board) return;
    const next: ReorderBoard = toSelected
      ? { available: board.available.filter((t) => t.id !== token.id), selected: [...board.selected, token] }
      : { available: [...board.available, token], selected: board.selected.filter((t) => t.id !== token.id) };
    setBoards((prev) => ({ ...prev, [index]: next }));
    setAnswer(next.selected.map((t) => t.text).join(' '));
  };

  const check = () => {
    const correct = isCorrect(exercise, answer);
    setVerdicts((prev) => prev.map((v, i) => (i === index ? correct : v)));
    if (!correct) {
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4, ease: 'easeInOut' } });
    }
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const result = await scoreAnswers(exercises, answers);
      navigate('/practice/results', { state: { result, topic, difficulty, exercises, answers } });
    } catch {
      setSubmitting(false);
      toast.error("Couldn't load your results", {
        description: 'Check your connection and try again.',
        action: { label: 'Retry', onClick: () => void finish() },
      });
    }
  };

  const primary = () => {
    if (submitting) return;
    if (verdict === null) {
      if (canCheck) check();
    } else if (isLast) {
      void finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // Keyboard: 1–4 picks an option, Enter checks / continues.
  useEffect(() => {
    if (!exercise) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;

      if (e.key === 'Enter') {
        // Answer buttons keep focus after a mouse click. Enter checks the
        // answer instead of triggering the focused option's native click.
        const answerOption = target.closest('[role="radiogroup"][aria-label="Answer options"] [role="radio"]');
        if (target.closest('button, a') && !answerOption) return;
        e.preventDefault();
        if (e.repeat || submitting) return;
        primary();
        return;
      }
      const n = Number(e.key);
      if (!isReorder && verdict === null && n >= 1 && n <= (exercise.options?.length ?? 0)) {
        setAnswer(exercise.options![n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const segments: SegmentState[] = exercises.map((_, i) =>
    verdicts[i] === true ? 'correct' : verdicts[i] === false ? 'incorrect' : i === index ? 'current' : 'upcoming',
  );

  const header = (
    <FocusHeader
      title={topic}
      subtitle={<span className="capitalize">{difficulty}</span>}
      progress={exercises.length > 0 ? <SegmentedProgress segments={segments} currentIndex={index} label={`Question ${index + 1} of ${exercises.length}`} /> : null}
      actions={
        exercises.length > 0 ? (
          <span className="text-caption text-muted tabular-nums">
            {index + 1}/{exercises.length}
          </span>
        ) : null
      }
      onExit={() => navigate('/practice')}
      confirmExit={exercises.length > 0 && verdicts.some((v) => v !== null)}
      exitTitle="Leave this practice?"
      exitDescription="Your answers so far won't be saved."
    />
  );

  if (generating) {
    return (
      <>
        {header}
        <GeneratingState topic={topic} />
      </>
    );
  }

  if (loadError || !exercise) {
    return (
      <>
        {header}
        <EmptyState
          className="mx-auto max-w-md py-20"
          visual={<ExclamationTriangleIcon className="size-10" />}
          title="Couldn't create questions"
          description="Something went wrong while generating your practice. Check your connection and try again."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/practice')}>
                Change topic
              </Button>
              <Button onClick={retry}>Try again</Button>
            </div>
          }
        />
      </>
    );
  }

  const supported = isReorder ? !!board : (exercise.options?.length ?? 0) > 0;

  return (
    <>
      {header}
      <main className="mx-auto max-w-2xl px-4 pb-48 pt-10 sm:px-6 sm:pt-14">
          <div
            key={index}
            ref={questionRef}
          >
            <div className="text-label text-accent-text">{TYPE_PROMPT[exercise.type] ?? 'Answer the question'}</div>
            <motion.div animate={shake} className="mt-3">
              {!supported ? (
                <p className="text-body text-muted">This question couldn't be displayed. Continue to the next one.</p>
              ) : isReorder ? (
                <ReorderQuestion
                  questionKey={`q-${index}`}
                  prompt={exercise.question}
                  board={board}
                  verdict={verdict}
                  onPick={(t) => moveToken(t, true)}
                  onUnpick={(t) => moveToken(t, false)}
                />
              ) : (
                <ChoiceQuestion exercise={exercise} answer={answer} verdict={verdict} onSelect={setAnswer} />
              )}
            </motion.div>
          </div>
      </main>

      <FeedbackBar
        verdict={verdict}
        correctAnswer={exercise.correct_answer}
        numberKeys={!isReorder}
        primaryLabel={verdict === null ? 'Check' : isLast ? 'See results' : 'Next'}
        primaryDisabled={verdict === null && !canCheck && supported}
        loading={submitting}
        previousDisabled={index === 0}
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        onPrimary={supported ? primary : () => (isLast ? void finish() : setIndex((i) => i + 1))}
      />
    </>
  );
}
