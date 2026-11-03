import { motion } from 'framer-motion';
import type { Exercise } from '../types';
import { cn } from '../ui';

type ChoiceQuestionProps = {
  exercise: Exercise;
  answer: string;
  /** null while answering; true/false once checked. */
  verdict: boolean | null;
  onSelect: (option: string) => void;
};

/** Splits "The apple ___ red." so the chosen word can be shown inside the sentence. */
function ClozeSentence({ text, filled, verdict }: { text: string; filled: string; verdict: boolean | null }) {
  const parts = text.split(/_{2,}/);
  if (parts.length < 2) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <span
        className={cn(
          'mx-1 inline-block min-w-16 border-b-2 px-1 text-center transition-colors duration-base',
          !filled && 'border-line-strong text-transparent',
          filled && verdict === null && 'border-accent text-accent-text',
          verdict === true && 'border-success text-success',
          verdict === false && 'border-danger text-danger',
        )}
      >
        {filled || ' '}
      </span>
      {parts.slice(1).join('___')}
    </>
  );
}

export function ChoiceQuestion({ exercise, answer, verdict, onSelect }: ChoiceQuestionProps) {
  const options = exercise.options ?? [];
  const checked = verdict !== null;

  return (
    <div>
      <h2 className="text-heading sm:text-title text-fg outline-none" data-question-heading tabIndex={-1}>
        {exercise.type === 'banked_cloze' ? (
          <ClozeSentence text={exercise.question} filled={answer} verdict={verdict} />
        ) : (
          exercise.question
        )}
      </h2>

      <div role="radiogroup" aria-label="Answer options" className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => {
          const selected = answer === option;
          const isAnswer = option === exercise.correct_answer;
          const state = !checked
            ? selected
              ? 'selected'
              : 'idle'
            : isAnswer
              ? 'correct'
              : selected
                ? 'incorrect'
                : 'dimmed';

          return (
            <motion.button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={checked}
              onClick={() => onSelect(option)}
              whileTap={checked ? undefined : { scale: 0.98 }}
              className={cn(
                'flex min-h-14 items-center gap-3 rounded-card border-2 px-4 py-3 text-left text-body outline-none',
                'transition-[background-color,border-color,color,opacity] duration-fast ease-standard',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                state === 'idle' && 'border-line bg-surface text-fg hover:border-line-strong',
                state === 'selected' && 'border-accent bg-accent-soft text-fg',
                state === 'correct' && 'border-success bg-success-soft text-fg',
                state === 'incorrect' && 'border-danger bg-danger-soft text-fg',
                state === 'dimmed' && 'border-line bg-surface text-subtle opacity-60',
              )}
            >
              <kbd
                className={cn(
                  'hidden size-6 shrink-0 items-center justify-center rounded-[6px] border text-caption font-medium sm:inline-flex',
                  'transition-colors duration-fast',
                  state === 'selected' ? 'border-accent-line text-accent-text' : 'border-line text-subtle',
                )}
              >
                {i + 1}
              </kbd>
              <span>{option}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
