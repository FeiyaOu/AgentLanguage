/**
 * One restrained confetti burst in brand colors. Reserved for real milestones
 * (mission complete, a high score). Skipped entirely under reduced motion.
 */
export async function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { default: confetti } = await import('canvas-confetti');
  const style = getComputedStyle(document.documentElement);
  const toHex = (token: string) => {
    const [r, g, b] = style.getPropertyValue(token).trim().split(/\s+/).map(Number);
    return [r, g, b].some(Number.isNaN) ? undefined : `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  };
  const colors = ['--color-accent', '--color-success', '--color-warning', '--color-accent-line']
    .map(toHex)
    .filter((c): c is string => !!c);

  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 38,
    ticks: 160,
    origin: { y: 0.55 },
    colors,
    disableForReducedMotion: true,
    zIndex: 60,
  });
}
