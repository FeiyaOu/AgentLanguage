import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Avatar, Button, Skeleton, SkeletonText, duration, ease } from '../ui';

type BriefingProps = {
  personaName: string;
  personaEmoji?: string;
  topic: string;
  difficulty: string;
  goal: string;
  scene: string;
  maxTurns: number;
  maxHints: number;
  onStart: () => void;
};

// Briefing replaces PreparingState, which already shows the same avatar and name in the
// same place, so items settle in rather than appearing from transparent.
const item = {
  hidden: { opacity: 0.6, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter } },
};

/** Pre-conversation screen: who you're talking to, what to achieve, and the rules. */
export function Briefing({ personaName, personaEmoji, topic, difficulty, goal, scene, maxTurns, maxHints, onStart }: BriefingProps) {
  return (
    <motion.div
      className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={item} className="flex flex-col items-center text-center">
        <Avatar name={personaName} emoji={personaEmoji} size="lg" />
        <h1 className="mt-4 text-title text-fg">{personaName}</h1>
        <p className="mt-1 text-body-sm text-muted">
          {topic} · <span className="capitalize">{difficulty}</span>
        </p>
      </motion.div>

      <motion.section variants={item} className="mt-8 rounded-card border border-accent-line bg-accent-soft p-5">
        <h2 className="text-label text-accent-text">Your mission</h2>
        <p className="mt-1.5 text-body text-fg">{goal}</p>
      </motion.section>

      {scene && (
        <motion.section variants={item} className="mt-4 rounded-card border border-line bg-surface p-5">
          <h2 className="text-label text-muted">The scene</h2>
          <p className="mt-1.5 text-body-sm text-fg">{scene}</p>
        </motion.section>
      )}

      <motion.ul variants={item} className="mt-6 space-y-2 text-body-sm text-muted">
        <li>
          You have <span className="font-medium text-fg">{maxTurns} messages</span> to complete the mission.
        </li>
        <li>
          Stuck? Ask the coach for a hint — up to <span className="font-medium text-fg">{maxHints}</span> per conversation.
        </li>
        <li>Mistakes are fine. That's how you learn.</li>
      </motion.ul>

      <motion.div variants={item} className="mt-8">
        <Button size="lg" block onClick={onStart}>
          Start conversation
          <ArrowRightIcon className="size-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

type PreparingStateProps = {
  /** Known from the setup page, so the partner can be shown before the API answers. */
  personaName?: string;
  personaEmoji?: string;
  topic: string;
};

const STAGE_MS = 1800;

/**
 * Shown while the scene is generated (several seconds). Mirrors the Briefing layout so
 * the hand-off is seamless: the partner's avatar "arrives" with expanding rings, the
 * status line says what is happening, and skeletons hold the mission and scene cards.
 */
export function PreparingState({ personaName, personaEmoji, topic }: PreparingStateProps) {
  const firstName = personaName?.split(/\s+/)[0];
  const stages = ['Setting the scene…', firstName ? `Getting ${firstName} ready…` : 'Getting your partner ready…', 'Writing your mission…'];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), STAGE_MS);
    return () => clearInterval(timer);
  }, [stages.length]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16" aria-busy>
      <div className="flex flex-col items-center text-center">
        <div className="relative flex size-14 items-center justify-center">
          {/* Two rings expand and fade in turn: a calm "arriving" pulse rather than a spinner. */}
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-pill border-2 border-accent/50"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
              transition={{ duration: 2, ease: ease.exit, repeat: Infinity, delay: i * 1 }}
            />
          ))}
          <motion.div
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: duration.base, ease: ease.enter }}
          >
            <Avatar name={personaName ?? 'Your partner'} emoji={personaEmoji ?? '🎭'} size="lg" />
          </motion.div>
        </div>
        <h1 className="mt-4 text-title text-fg">{personaName ?? 'Your conversation partner'}</h1>
        <p className="mt-1 text-body-sm text-muted">{topic}</p>
      </div>

      <div className="mt-8 rounded-card border border-accent-line bg-accent-soft p-5">
        <Skeleton className="h-3.5 w-24" />
        <SkeletonText lines={2} className="mt-3" />
      </div>
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <Skeleton className="h-3.5 w-20" />
        <SkeletonText lines={3} className="mt-3" />
      </div>
      {/* Sits where Briefing lists the rules, so the cards above line up exactly on hand-off. */}
      <div className="mt-6 h-5 text-body-sm text-accent-text" role="status" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={stage}
            className="inline-block"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: duration.base, ease: ease.standard }}
          >
            {stages[stage]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
