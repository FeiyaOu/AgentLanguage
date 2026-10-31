import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from './cn';

/*
 * Radix handles focus trapping, Escape, scroll lock and ARIA; we own the visuals.
 * Enter/exit use CSS keyframes keyed off Radix's data-state, which Radix waits on
 * before unmounting. Reduced motion falls back to a plain fade.
 */

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

type DialogContentProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Hide the corner close button, e.g. when the dialog requires an explicit choice. */
  hideClose?: boolean;
};

export function DialogContent({ title, description, children, className, hideClose = false }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]',
          'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        )}
      />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto',
          'bg-raised border border-line rounded-card shadow-overlay p-6',
          'focus:outline-none',
          'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
          'motion-reduce:data-[state=open]:animate-fade-in motion-reduce:data-[state=closed]:animate-fade-out',
          className,
        )}
      >
        <div className="pr-8">
          <RadixDialog.Title className="text-heading text-fg">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-body-sm text-muted">{description}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
        </div>
        {children && <div className="mt-5">{children}</div>}
        {!hideClose && (
          <RadixDialog.Close
            className={cn(
              'absolute right-4 top-4 rounded-pill p-1.5 text-subtle',
              'transition-colors duration-fast hover:bg-sunken hover:text-fg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Close"
          >
            <XMarkIcon className="size-5" />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
