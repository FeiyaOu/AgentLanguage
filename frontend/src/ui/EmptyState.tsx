import type { ReactNode } from 'react';
import { cn } from './cn';

type EmptyStateProps = {
  /** An icon or illustration (e.g. a Lottie player). */
  visual?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ visual, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 py-12', className)}>
      {visual && <div className="mb-5 text-subtle">{visual}</div>}
      <h3 className="text-heading text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-body-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
