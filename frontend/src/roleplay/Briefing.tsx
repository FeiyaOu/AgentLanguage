import { motion } from 'framer-motion';
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

const item = {
  hidden: { opacity: 0, y: 10 },
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

export function BriefingSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16" aria-busy>
      <div className="flex flex-col items-center">
        <Skeleton className="size-14 rounded-pill" />
        <Skeleton className="mt-4 h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-36" />
      </div>
      <div className="mt-8 rounded-card border border-line p-5">
        <Skeleton className="h-3.5 w-24" />
        <SkeletonText lines={2} className="mt-3" />
      </div>
      <div className="mt-4 rounded-card border border-line p-5">
        <Skeleton className="h-3.5 w-20" />
        <SkeletonText lines={3} className="mt-3" />
      </div>
      <p className="mt-6 text-center text-body-sm text-muted" role="status">
        Setting the scene…
      </p>
    </div>
  );
}
