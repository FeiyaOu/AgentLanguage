import { Link } from 'react-router-dom';
import { cn } from '../ui';

/** Wordmark with a speech-bubble mark. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label="AgentLanguage home"
    >
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="8" className="fill-accent" />
        <path
          d="M8.5 9.5h11a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5H13l-3.25 2.5V18H8.5A1.5 1.5 0 0 1 7 16.5V11a1.5 1.5 0 0 1 1.5-1.5Z"
          className="fill-accent-fg"
        />
      </svg>
      <span className="text-body font-semibold tracking-tight text-fg">AgentLanguage</span>
    </Link>
  );
}
