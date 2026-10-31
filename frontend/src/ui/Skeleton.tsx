import type { ComponentProps } from 'react';
import { cn } from './cn';

/**
 * Placeholder for content with a known shape. A highlight sweeps across;
 * with reduced motion it stays as a static block.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-sunken rounded-control',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-surface/60 before:to-transparent',
        'motion-reduce:before:hidden',
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
