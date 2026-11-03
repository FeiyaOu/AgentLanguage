import { AnimatePresence, motion } from 'framer-motion';
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
          <AnimatePresence mode="wait" initial={false}>
            {verdict === null ? (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden text-caption text-subtle sm:block"
              >
                Press{' '}
                {numberKeys && (
                  <>
                    <kbd className="font-medium text-muted">1–4</kbd> to choose,{' '}
                  </>
                )}
                <kbd className="font-medium text-muted">Enter</kbd> to check
              </motion.p>
            ) : (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.base, ease: ease.enter }}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          size="lg"
          onClick={onPrimary}
          disabled={primaryDisabled}
          loading={loading}
          className="w-full sm:w-auto sm:min-w-40"
        >
          {primaryLabel}
        </Button>
      </div>
    </motion.div>
  );
}
