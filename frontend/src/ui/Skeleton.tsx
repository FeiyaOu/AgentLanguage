import type { ComponentProps } from 'react';
import { cn } from './cn';

/**
 * Placeholder for content with a known shape. A highlight sweeps across;
 * Standard placeholders respect reduced motion; prominent loading feedback always animates.
 */
export function Skeleton({ className, prominent = false, ...props }: ComponentProps<'div'> & { prominent?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-skeleton rounded-control',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-surface/70 before:to-transparent',
        !prominent && 'motion-reduce:before:hidden',
        prominent && [
          'bg-accent-line animate-[skeleton-pulse_3.2s_ease-in-out_infinite]',
          'before:animate-[shimmer_3s_linear_infinite] before:via-surface/25',
        ],
        className,
      )}
      {...props}
    />
  );
}

/** A few lines of text-shaped skeleton; the last line is shorter, like real paragraphs. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}
