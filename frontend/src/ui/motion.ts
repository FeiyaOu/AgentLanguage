/**
 * Motion tokens for Motion (framer-motion) components.
 * Mirrors the CSS variables in src/styles/tokens.css — keep the two in sync.
 */

export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
} as const;

export const spring = {
  /** Small, direct-manipulation feedback: selections, toggles, indicators. */
  snappy: { type: 'spring', stiffness: 500, damping: 32 },
  /** Larger elements settling into place: cards, panels, progress. */
  gentle: { type: 'spring', stiffness: 220, damping: 28 },
} as const;
