import { useState, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Dialog, DialogClose, DialogContent } from '../ui';

type FocusHeaderProps = {
  /** Shown before the title, e.g. the conversation partner's avatar. */
  leading?: ReactNode;
  title: string;
  /** Shown under the title, e.g. topic and level. */
  subtitle?: ReactNode;
  /** Progress indicator (bar, segments) spanning the header's middle. */
  progress?: ReactNode;
  /** Actions on the right, e.g. "Ask coach". */
  actions?: ReactNode;
  /** Called after the learner confirms leaving. */
  onExit: () => void;
  /** Skip the confirmation, e.g. when nothing would be lost. */
  confirmExit?: boolean;
  exitTitle?: string;
  exitDescription?: string;
};

/**
 * Header for focus mode (an active practice or conversation): the global nav is
 * hidden and only exit, title and progress remain, to keep attention on the task.
 */
export function FocusHeader({
  leading,
  title,
  subtitle,
  progress,
  actions,
  onExit,
  confirmExit = true,
  exitTitle = 'Leave this session?',
  exitDescription = "Your progress won't be saved.",
}: FocusHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Exit"
          onClick={() => (confirmExit ? setConfirmOpen(true) : onExit())}
          className="-ml-2 shrink-0"
        >
          <XMarkIcon className="size-5" />
        </Button>

        <div className="flex min-w-0 max-w-[45%] shrink-0 items-center gap-2.5">
          {leading}
          <div className="min-w-0">
            <div className="truncate text-body-sm font-semibold text-fg">{title}</div>
            {subtitle && <div className="truncate text-caption text-muted">{subtitle}</div>}
          </div>
        </div>

        <div className="min-w-0 flex-1">{progress}</div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title={exitTitle} description={exitDescription}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Keep going</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmOpen(false);
                onExit();
              }}
            >
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
