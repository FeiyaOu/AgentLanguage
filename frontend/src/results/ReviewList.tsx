import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChatBubbleLeftEllipsisIcon, CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, cn, duration, ease } from '../ui';

export type ReviewItem = {
  num: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  feedback: string;
};

function ReviewRow({ item, index, onAskTutor }: { item: ReviewItem; index: number; onAskTutor: (item: ReviewItem) => void }) {
  const reduceMotion = useReducedMotion();
  // Mistakes start open: they're what the learner came here to review.
  const [open, setOpen] = useState(!item.correct);
  const panelId = `review-${item.num}`;

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: ease.enter, delay: reduceMotion ? 0 : Math.min(index, 5) * 0.05 }}
      className={cn(
        'rounded-card border border-line border-l-[3px] bg-surface',
        item.correct ? 'border-l-success' : 'border-l-danger',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-card px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-pill',
            item.correct ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
        >
          {item.correct ? <CheckIcon className="size-3.5" strokeWidth={2.5} /> : <XMarkIcon className="size-3.5" strokeWidth={2.5} />}
          <span className="sr-only">{item.correct ? 'Correct' : 'Incorrect'}</span>
        </span>
        <span className="shrink-0 text-caption tabular-nums text-subtle">Q{item.num}</span>
        <span className="min-w-0 flex-1 break-words text-body-sm text-fg">{item.question}</span>
        <ChevronDownIcon
          className={cn('size-4 shrink-0 text-muted transition-transform duration-base ease-standard motion-reduce:transition-none', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: reduceMotion ? 0 : 0.3, ease: ease.standard },
              opacity: { duration: reduceMotion ? 0 : duration.fast, delay: open && !reduceMotion ? 0.05 : 0 },
            }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 pl-[3.25rem]">
              <dl className="grid gap-x-6 gap-y-2 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-subtle">Your answer</dt>
                  <dd className={cn('mt-0.5 font-medium', item.correct ? 'text-success' : 'text-danger')}>
                    {item.userAnswer || 'No answer'}
                  </dd>
                </div>
                {!item.correct && (
                  <div>
                    <dt className="text-caption text-subtle">Correct answer</dt>
                    <dd className="mt-0.5 font-medium text-success">{item.correctAnswer}</dd>
                  </div>
                )}
              </dl>
              {item.feedback && <p className="text-body-sm text-muted">{item.feedback}</p>}
              <Button variant="ghost" size="sm" onClick={() => onAskTutor(item)} className="-ml-3">
                <ChatBubbleLeftEllipsisIcon className="size-4" />
                Ask the tutor
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function ReviewList({ items, onAskTutor }: { items: ReviewItem[]; onAskTutor: (item: ReviewItem) => void }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <ReviewRow key={item.num} item={item} index={index} onAskTutor={onAskTutor} />
      ))}
    </ul>
  );
}
