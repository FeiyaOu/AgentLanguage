import { useEffect, useState, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { Card, ProgressRing, celebrate, ease } from '../ui';

const TIERS = [
  { min: 80, title: 'Excellent work', body: (topic: string) => `You've got a solid handle on ${topic}.`, tone: 'success' },
  { min: 50, title: 'Good progress', body: () => 'A few things to tighten up — review the ones you missed.', tone: 'accent' },
  { min: 0, title: 'Keep going', body: () => "This topic needs more practice, and that's exactly what it's for.", tone: 'warning' },
] as const;

type ScoreSummaryProps = {
  percentage: number;
  correct: number;
  total: number;
  topic: string;
  difficulty: string;
  actions: ReactNode;
};

/** Score ring and number count up together, driven by one animated value. */
export function ScoreSummary({ percentage, correct, total, topic, difficulty, actions }: ScoreSummaryProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const tier = TIERS.find((t) => percentage >= t.min) ?? TIERS[TIERS.length - 1];

  useEffect(() => {
    const controls = animate(0, percentage, {
      duration: reduceMotion ? 0 : 0.9,
      ease: ease.enter,
      delay: reduceMotion ? 0 : 0.15,
      onUpdate: (v) => setShown(v),
      onComplete: () => {
        if (percentage >= 80) void celebrate();
      },
    });
    return () => controls.stop();
  }, [percentage, reduceMotion]);

  return (
    <Card padding="lg" className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
      <ProgressRing value={shown} label={`Score ${percentage}%`} tone={tier.tone} size={128} strokeWidth={10} transition={false}>
        <span className="text-title tabular-nums text-fg">{Math.round(shown)}%</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <h1 className="text-title text-fg">{tier.title}</h1>
        <p className="mt-1.5 text-body text-muted">{tier.body(topic)}</p>
        <p className="mt-3 text-body-sm text-subtle">
          {correct} of {total} correct · {topic} · <span className="capitalize">{difficulty}</span>
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">{actions}</div>
      </div>
    </Card>
  );
}
