import { useId, useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from './cn';
import { spring } from './motion';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  tone?: 'neutral' | 'accent';
};

/**
 * Single choice among a few options (radiogroup semantics).
 * The selection indicator slides between options via a shared layoutId;
 * arrow keys move the selection, like native radios.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  tone = 'neutral',
}: SegmentedControlProps<T>) {
  const layoutId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-1 rounded-control bg-sunken p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative h-9 rounded-[8px] text-body-sm font-medium outline-none',
              'transition-colors duration-fast ease-standard',
              'focus-visible:ring-2 focus-visible:ring-ring',
              tone === 'accent'
                ? 'bg-accent-soft text-accent-text ring-1 ring-inset ring-accent-line hover:ring-accent-text'
                : selected ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                transition={spring.snappy}
                className={cn(
                  'absolute inset-0 rounded-[8px]',
                  tone === 'accent'
                    ? 'bg-accent-soft border border-accent-text ring-1 ring-accent-text'
                    : 'bg-surface shadow-raised',
                )}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
