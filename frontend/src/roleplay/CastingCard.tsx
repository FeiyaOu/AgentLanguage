import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Skeleton, spring } from '../ui';

// A cast of possible characters to cycle through while partners are being chosen.
const CAST = ['🧑‍🍳', '👩‍💼', '🎩', '🧳', '👨‍⚕️', '🙋', '👮', '🧑‍🏫', '💁', '🧑‍🔧', '👩‍🎤', '🕵️'];
const STEP_MS = 650;

/**
 * Placeholder partner card while suggestions load. The avatar slot "casts" for the
 * role: emoji roll upward like a slot reel, each card on its own offset so the grid
 * feels alive rather than ticking in unison. Text lines stay as shimmering skeletons.
 * When the real card cross-fades in, its emoji takes over the same slot.
 */
export function CastingCard({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  // Start each card at a different point in the cast so neighbours never match.
  const [step, setStep] = useState(index * 3);

  useEffect(() => {
    if (reduceMotion) return;
    let interval: ReturnType<typeof setInterval>;
    // Stagger when each card starts rolling, then keep a steady rhythm.
    const start = setTimeout(() => {
      setStep((s) => s + 1);
      interval = setInterval(() => setStep((s) => s + 1), STEP_MS);
    }, 200 + index * 160);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [index, reduceMotion]);

  const emoji = CAST[step % CAST.length];

  return (
    <div className="rounded-card border border-line bg-surface p-4" aria-hidden>
      <div className="relative size-10">
        {!reduceMotion && (
          <motion.span
            className="absolute inset-0 rounded-pill border-2 border-accent/40"
            animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: index * 0.25 }}
          />
        )}
        <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-pill bg-accent-soft ring-1 ring-inset ring-accent-line/70">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={step}
              className="text-xl leading-none"
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -22, opacity: 0 }}
              transition={spring.snappy}
            >
              {emoji}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <Skeleton className="mt-3 h-3.5 w-2/3" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
    </div>
  );
}
