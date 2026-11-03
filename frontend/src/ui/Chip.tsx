import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

/** Interactive, toggleable pill. States: default · hover · selected · focus-visible · disabled. */
const chipVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color,transform] duration-fast ease-standard',
    'active:scale-[0.97] motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      selected: {
        true: 'bg-accent-soft border-accent-line text-accent-text',
        false: 'bg-surface border-line text-muted hover:border-line-strong hover:text-fg',
      },
      size: {
        sm: 'h-7 px-2.5 text-caption',
        md: 'h-9 px-3.5 text-body-sm',
      },
    },
    defaultVariants: {
      selected: false,
      size: 'md',
    },
  },
);

type ChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & VariantProps<typeof chipVariants>;

export function Chip({ className, selected, size, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected ?? false}
      className={cn(chipVariants({ selected, size }), className)}
      {...props}
    />
  );
}

/** Static, non-interactive label. */
const badgeVariants = cva('inline-flex items-center gap-1 rounded-pill px-2 h-6 text-caption font-medium', {
  variants: {
    tone: {
      neutral: 'bg-sunken text-muted',
      accent: 'bg-accent-soft text-accent-text',
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft text-danger',
      warning: 'bg-warning-soft text-warning',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Difficulty shown as 1–3 dots in neutral tones, instead of one color per level. */
const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 } as const;

export function LevelBadge({ level, className }: { level: string; className?: string }) {
  const filled = LEVELS[level as keyof typeof LEVELS] ?? 1;
  return (
    <Badge className={cn('capitalize', className)}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('size-1.5 rounded-pill', n <= filled ? 'bg-fg/70' : 'bg-fg/15')} />
        ))}
      </span>
      {level}
    </Badge>
  );
}
