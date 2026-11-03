import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'accent' | 'success' | 'warning' | 'danger';

const fillTone: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const strokeTone: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  label: string;
  tone?: Tone;
  className?: string;
};

/** Continuous progress. Width animates with the slow motion token. */
export function ProgressBar({ value, label, tone = 'accent', className }: ProgressBarProps) {
  const v = clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn('h-1.5 w-full overflow-hidden rounded-pill bg-sunken', className)}
    >
      <div
        className={cn('h-full rounded-pill transition-[width,background-color] duration-slow ease-standard', fillTone[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export type SegmentState = 'upcoming' | 'current' | 'correct' | 'incorrect';

const segmentClass: Record<SegmentState, string> = {
  upcoming: 'bg-sunken',
  current: 'bg-accent/40',
  correct: 'bg-success',
  incorrect: 'bg-danger',
};

/** Step-by-step progress, one segment per item (e.g. one per question). */
export function SegmentedProgress({
  segments,
  label,
  className,
  currentIndex,
}: {
  segments: SegmentState[];
  label: string;
  className?: string;
  currentIndex?: number;
}) {
  const done = segments.filter((s) => s === 'correct' || s === 'incorrect').length;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-valuenow={done}
      className={cn('flex w-full gap-1', className)}
    >
      {segments.map((state, i) => (
        <div
          key={i}
          aria-current={i === currentIndex ? 'step' : undefined}
          className={cn(
            'h-1.5 flex-1 rounded-pill transition-colors duration-base ease-standard',
            segmentClass[state],
            i === currentIndex && 'ring-2 ring-offset-2 ring-offset-canvas',
            i === currentIndex && (state === 'correct'
              ? 'ring-success'
              : state === 'incorrect'
                ? 'ring-danger'
                : 'ring-accent/40'),
          )}
        />
      ))}
    </div>
  );
}

type ProgressRingProps = {
  /** 0–100 */
  value: number;
  label: string;
  tone?: Tone;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
  /** Set false when the value is already animated by JS (e.g. a count-up), to avoid a lagging CSS transition. */
  transition?: boolean;
};

/** Circular progress; the stroke draws in via stroke-dashoffset. Children render in the center. */
export function ProgressRing({
  value,
  label,
  tone = 'accent',
  size = 120,
  strokeWidth = 8,
  className,
  children,
  transition = true,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamp(value) / 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value))}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(transition && 'transition-[stroke-dashoffset] duration-slow ease-enter', strokeTone[tone])}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}
