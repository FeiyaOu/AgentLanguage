import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { LottieHandle } from 'lottie-react';
import { cn } from './cn';
import { useColorScheme } from './useColorScheme';

// lottie-web is large; load it only when an animation is actually shown.
// The light build suffices: our animations use no expressions. Destructuring lets the
// bundler tree-shake the other engine builds (and their eval) out of the lazy chunk.
const Lottie = lazy(() => import('lottie-react').then(({ LottieLight }) => ({ default: LottieLight })));

/**
 * Fills and strokes in our animation files are *named* after design tokens
 * (e.g. "accent"); their colors are swapped in at runtime so animations follow
 * the active theme instead of baking colors into the file.
 */
const TOKEN_FOR_NAME: Record<string, string> = {
  accent: '--color-accent',
  accentSoft: '--color-accent-soft',
  onAccent: '--color-accent-fg',
  surface: '--color-surface',
  line: '--color-line-strong',
  muted: '--color-line-strong',
};

type LottieNode = { ty?: string; nm?: string; c?: { k: number[] }; [key: string]: unknown };

function readToken(name: string): number[] | null {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => !Number.isNaN(n)) ? [...parts.map((n) => n / 255), 1] : null;
}

function applyTokens<T>(data: T): T {
  const copy = structuredClone(data);
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as LottieNode;
    if ((n.ty === 'fl' || n.ty === 'st') && n.nm && TOKEN_FOR_NAME[n.nm] && n.c) {
      const rgba = readToken(TOKEN_FOR_NAME[n.nm]);
      if (rgba) n.c.k = rgba;
    }
    Object.values(n).forEach(walk);
  };
  walk(copy);
  return copy;
}

type ThemedLottieProps = {
  animationData: object;
  /** Accessible description; omit for purely decorative animations. */
  label?: string;
  loop?: boolean;
  /** Play only this frame range, e.g. stop before a loop's fade-out. */
  segment?: readonly [number, number];
  /** Frame to show under reduced motion; defaults to the end of what would play. */
  reducedMotionFrame?: number;
  className?: string;
};

/**
 * Lottie player that follows the theme, pauses while off-screen, and under
 * reduced motion shows the final frame instead of playing.
 */
export function ThemedLottie({
  animationData,
  label,
  loop = false,
  segment,
  reducedMotionFrame,
  className,
}: ThemedLottieProps) {
  const scheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieHandle>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read token colors when the theme changes
  const themed = useMemo(() => applyTokens(animationData), [animationData, scheme]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || reduceMotion || !loop) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) lottieRef.current?.play();
      else lottieRef.current?.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion, loop]);

  const showFinalFrame = () => {
    if (reduceMotion) lottieRef.current?.seek(reducedMotionFrame ?? { percent: 100 });
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('pointer-events-none', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Suspense fallback={null}>
        <Lottie
          lottieRef={lottieRef}
          src={themed}
          loop={loop && !reduceMotion}
          segment={segment}
          autoplay={!reduceMotion}
          subscriptions={{ ready: showFinalFrame }}
          className="size-full"
        />
      </Suspense>
    </div>
  );
}
