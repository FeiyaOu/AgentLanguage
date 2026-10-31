import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from './cn';

/** States: default · hover · focus · invalid (aria-invalid) · disabled. */
const fieldBase = [
  'w-full bg-surface text-fg text-body placeholder:text-subtle',
  'border border-line rounded-control outline-none',
  'transition-[border-color,box-shadow] duration-fast ease-standard',
  'hover:border-line-strong',
  'focus:border-accent focus:ring-4 focus:ring-ring/15',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15',
  'disabled:bg-sunken disabled:text-subtle disabled:cursor-not-allowed',
].join(' ');

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-11 px-3.5', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 px-3.5 py-2.5 resize-y', className)} {...props} />;
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Receives the generated id and aria props to spread onto the control. */
  children: (control: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
};

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-label text-fg">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={cn('text-caption', error ? 'text-danger' : 'text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
