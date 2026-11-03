import { motion } from 'framer-motion';
import { cn, ease } from '../ui';

/** A check or cross that draws itself along its path. */
export function AnimatedMark({ correct, className }: { correct: boolean; className?: string }) {
  const draw = {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
  };

  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-accent-fg',
        correct ? 'bg-success' : 'bg-danger',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        {correct ? (
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" {...draw} transition={{ duration: 0.35, ease: ease.enter, delay: 0.05 }} />
        ) : (
          <>
            <motion.path d="M7 7l10 10" {...draw} transition={{ duration: 0.2, ease: ease.enter, delay: 0.05 }} />
            <motion.path d="M17 7L7 17" {...draw} transition={{ duration: 0.2, ease: ease.enter, delay: 0.2 }} />
          </>
        )}
      </svg>
    </span>
  );
}
