import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useAnimationControls } from 'framer-motion';
import type { Exercise } from '../types';
import { streamPractice } from '../api';
import { FocusHeader } from '../components/FocusHeader';
import { Button, EmptyState, SegmentedProgress, type SegmentState } from '../ui';
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
  const [remainingLoading, setRemainingLoading] = useState(false);
  const [remainingError, setRemainingError] = useState<string>();
  const totalQuestions = provided?.length || 5;
  const shake = useAnimationControls();
  const questionRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  const received = useRef<Exercise[]>(provided ?? []);
  const streamController = useRef<AbortController | null>(null);
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchExercises = useCallback(async () => {
    if (streamController.current || received.current.length >= 5) return;
    const controller = new AbortController();
    streamController.current = controller;
    setRemainingLoading(true);
    setRemainingError(undefined);
    setLoadError(false);
    try {
      await streamPractice(topic, difficulty, focusAreas ?? [], received.current, (next) => {
        const position = received.current.length;
        received.current = [...received.current, next];
        setExercises(received.current);
        setAnswers((prev) => [...prev, '']);
        setVerdicts((prev) => [...prev, null]);
        if (next.type === 'sentence_reordering') {
          const nextBoard = buildBoard(next);
          setBoards((prev) => ({ ...prev, [position]: nextBoard }));
        }
        setGenerating(false);
      }, controller.signal);
    } catch {
      if (!controller.signal.aborted && received.current.length < 5) {
        if (received.current.length === 0) setLoadError(true);
        else setRemainingError("Couldn't load the remaining questions. Your answers are saved; retry to continue.");
      }
    } finally {
      if (!controller.signal.aborted) {
        streamController.current = null;
        setRemainingLoading(false);
        setGenerating(false);
      }
    }
  }, [topic, difficulty, focusAreas]);

  useEffect(() => {
    clearTimeout(cleanupTimer.current);
    if (!fetched.current && !provided?.length) {
      fetched.current = true;
      void fetchExercises();
    }
    // Defer cleanup one tick so StrictMode's setup replay reuses the request.
    return () => {
      cleanupTimer.current = setTimeout(() => streamController.current?.abort(), 0);
    };
  }, [fetchExercises, provided]);

  const retry = () => {
    setGenerating(true);
    void fetchExercises();
  };

  const exercise = exercises[index];
  const answer = answers[index] ?? '';
  const verdict = verdicts[index] ?? null;
  const isLast = index === totalQuestions - 1;
  const awaitingNext = index === exercises.length - 1 && exercises.length < totalQuestions;
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

  const finish = () => {
    navigate('/practice/results', { state: { topic, difficulty, exercises, answers } });
  };

  const primary = () => {
    if (verdict !== null && awaitingNext && remainingLoading) return;
    if (verdict === null) {
      if (canCheck) check();
    } else if (awaitingNext) {
      void fetchExercises();
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
        if (e.repeat) return;
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

  const segments: SegmentState[] = Array.from({ length: totalQuestions }, (_, i) =>
    verdicts[i] === true ? 'correct' : verdicts[i] === false ? 'incorrect' : i === index ? 'current' : 'upcoming',
  );

  const header = (
    <FocusHeader
      title={topic}
      subtitle={<span className="capitalize">{difficulty}</span>}
      progress={exercises.length > 0 ? <SegmentedProgress segments={segments} currentIndex={index} label={`Question ${index + 1} of ${totalQuestions}`} /> : null}
      actions={
        exercises.length > 0 ? (
          <span className="text-caption text-muted tabular-nums">
            {index + 1}/{totalQuestions}
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
          {remainingError && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-body-sm text-danger">{remainingError}</p>}
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
        primaryLabel={verdict === null ? 'Check' : awaitingNext ? remainingError ? 'Retry loading' : 'Preparing questions…' : isLast ? 'See results' : 'Next'}
        primaryDisabled={(verdict === null && !canCheck && supported) || (verdict !== null && awaitingNext && remainingLoading)}
        previousDisabled={index === 0}
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        onPrimary={supported ? primary : () => {
          if (awaitingNext) {
            if (!remainingLoading) void fetchExercises();
          } else if (isLast) {
            void finish();
          } else {
            setIndex((i) => i + 1);
          }
        }}
      />
    </>
  );
}
