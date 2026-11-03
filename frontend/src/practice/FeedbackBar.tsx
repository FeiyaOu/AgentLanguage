import { motion } from 'framer-motion';
import { Button, cn, duration, ease } from '../ui';
import { AnimatedMark } from './AnimatedMark';

type FeedbackBarProps = {
  verdict: boolean | null;
  correctAnswer: string;
  primaryLabel: string;
  primaryDisabled: boolean;
  loading?: boolean;
  /** Choice questions can be answered with number keys; reordering only uses Enter. */
  numberKeys: boolean;
  onPrimary: () => void;
  onPrevious: () => void;
  previousDisabled: boolean;
};

/**
 * Bottom action bar. Before checking it holds the Check button; after checking
 * the bar tints and the verdict slides in beside the Continue button.
 */
export function FeedbackBar({
  verdict,
  correctAnswer,
  primaryLabel,
  primaryDisabled,
  loading,
  numberKeys,
  onPrimary,
  onPrevious,
  previousDisabled,
}: FeedbackBarProps) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ duration: duration.slow, ease: ease.enter }}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)]',
        'transition-colors duration-base ease-standard',
        verdict === null && 'border-line bg-surface',
        verdict === true && 'border-success/30 bg-success-soft',
        verdict === false && 'border-danger/30 bg-danger-soft',
      )}
    >
      <div className="mx-auto flex min-h-24 max-w-2xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0 flex-1" aria-live="polite">
            {verdict === null ? (
              <p
                className="hidden text-caption text-subtle sm:block"
              >
                Press{' '}
                {numberKeys && (
                  <>
                    <kbd className="font-medium text-muted">1–4</kbd> to choose,{' '}
                  </>
                )}
                <kbd className="font-medium text-muted">Enter</kbd> to check
              </p>
            ) : (
              <div
                className="flex items-center gap-3"
              >
                <AnimatedMark correct={verdict} />
                <div className="min-w-0">
                  <div className={cn('text-body font-semibold', verdict ? 'text-success' : 'text-danger')}>
                    {verdict ? 'Nicely done' : 'Not quite'}
                  </div>
                  {!verdict && (
                    <div className="text-body-sm text-fg">
                      Correct answer: <span className="font-medium">{correctAnswer}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="secondary"
            size="lg"
            onClick={onPrevious}
            disabled={previousDisabled || loading}
            className="flex-1 sm:flex-none"
          >
            Previous
          </Button>
        <Button
          size="lg"
          onClick={onPrimary}
          disabled={primaryDisabled}
          loading={loading}
          className="flex-1 sm:flex-none sm:min-w-40"
        >
          {primaryLabel}
        </Button>
        </div>
      </div>
    </motion.div>
  );
}
