import type { ComponentProps } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Spinner } from './Spinner';
import { buttonVariants } from './buttonVariants';

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/*
        The swap to a spinner is a CSS animation delayed by 300ms: a quick request
        finishes before anything changes, so the label never blinks. Slow ones show
        the spinner. When loading ends, both snap back with no state to clean up.
      */}
      <span className={cn('inline-flex items-center gap-2', loading && 'animate-loading-out')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex animate-loading-in items-center justify-center">
          <Spinner className="size-4" />
        </span>
      )}
    </button>
  );
}
