import { useEffect } from 'react';
import { Button, Dialog, DialogContent, ProgressRing, ThemedLottie, celebrate } from '../ui';
import { successAnimation } from '../content/animations';

type EndDialogProps = {
  open: boolean;
  achieved: boolean;
  progress: number;
  replaying: boolean;
  onReplay: () => void;
  onFinish: () => void;
};

/** Shown when the mission is achieved or the learner runs out of messages. Requires a choice. */
export function EndDialog({ open, achieved, progress, replaying, onReplay, onFinish }: EndDialogProps) {
  useEffect(() => {
    if (open && achieved) void celebrate();
  }, [open, achieved]);

  return (
    <Dialog open={open}>
      <DialogContent
        title={achieved ? 'Mission complete' : 'Out of messages'}
        description={achieved ? 'You reached the goal. Nicely done.' : 'Try again with a tighter plan — you were getting there.'}
        hideClose
      >
        <div className="flex flex-col items-center">
          {achieved ? (
            <ThemedLottie animationData={successAnimation} label="Mission complete" className="size-32" />
          ) : (
            <ProgressRing value={progress} label="Mission progress" tone="accent" size={112}>
              <span className="text-title text-fg tabular-nums">{Math.round(progress)}%</span>
              <span className="text-caption text-muted">progress</span>
            </ProgressRing>
          )}
          <div className="mt-6 grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onReplay} loading={replaying}>
              Try again
            </Button>
            <Button onClick={onFinish}>Finish</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
