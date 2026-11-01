import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { duration, ease } from '../ui';

/**
 * Entering focus mode: the page fades in while its header slides down and its
 * action bar slides up (those motions live in FocusHeader / FeedbackBar).
 * Opacity only here — a transform on this wrapper would break the fixed-position
 * bars inside it while the animation runs.
 */
export function FocusTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: duration.slow, ease: ease.standard }}>
      {children}
    </motion.div>
  );
}
