import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton, ThemedLottie, duration, ease } from '../ui';
import { WRITING_DRAWN_FRAME, writingAnimation } from '../content/animations';

const STAGES = ['Reading your topic…', 'Writing questions…', 'Checking the answers…'];
const STAGE_MS = 1800;

/**
 * Generation takes several seconds, so instead of a spinner we show the shape of
 * what's coming (a question skeleton) and say what is happening right now.
 */
export function GeneratingState({ topic }: { topic: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), STAGE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14" aria-busy>
      <div className="flex items-center gap-2 text-body-sm text-muted" role="status" aria-live="polite">
        <ThemedLottie
          animationData={writingAnimation}
          loop
          reducedMotionFrame={WRITING_DRAWN_FRAME}
          className="-my-2 size-10 shrink-0"
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: duration.base, ease: ease.standard }}
          >
            {STAGES[stage]}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="sr-only">Preparing questions about {topic}</p>

      <Skeleton className="mt-6 h-3 w-32" />
      <Skeleton className="mt-4 h-7 w-full" />
      <Skeleton className="mt-2 h-7 w-3/4" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-card" />
        ))}
      </div>
    </div>
  );
}
