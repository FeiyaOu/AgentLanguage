import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { LottieHandle } from 'lottie-react';
import { cn } from './cn';

// lottie-web is large; load it only when an animation is actually shown.
// The light build suffices: our animations use no expressions. Destructuring lets the
// bundler tree-shake the other engine builds (and their eval) out of the lazy chunk.
const Lottie = lazy(() => import('lottie-react').then(({ LottieLight }) => ({ default: LottieLight })));

/**
 * Fills and strokes in our animation files are *named* after design tokens
 * (e.g. "accent"). Each name is swapped for a unique placeholder color, and CSS
 * in index.css (`.themed-lottie [fill="rgb(255,0,1)"]` …) paints it with the token.
 * A theme change is then a pure CSS update: the animation never reloads or restarts.
 * Keep the blue channel here in sync with those CSS rules.
 */
const PLACEHOLDER_BLUE: Record<string, number> = {
  accent: 1,
  accentSoft: 2,
  onAccent: 3,
  surface: 4,
  line: 5,
  muted: 6,
};

type LottieNode = { ty?: string; nm?: string; c?: { k: number[] }; [key: string]: unknown };

function applyPlaceholders<T>(data: T): T {
  const copy = structuredClone(data);
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as LottieNode;
    if ((n.ty === 'fl' || n.ty === 'st') && n.nm && PLACEHOLDER_BLUE[n.nm] && n.c) {
      n.c.k = [1, 0, PLACEHOLDER_BLUE[n.nm] / 255, 1];
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
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieHandle>(null);
  const inViewRef = useRef(true);
  const themed = useMemo(() => applyPlaceholders(animationData), [animationData]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || reduceMotion || !loop) return;
    const observer = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting;
      if (entry.isIntersecting) lottieRef.current?.play();
      else lottieRef.current?.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion, loop]);

  const showFinalFrame = () => {
    if (reduceMotion) {
      lottieRef.current?.pause();
      lottieRef.current?.seek(reducedMotionFrame ?? { percent: 100 });
    } else if (loop) {
      // The observer can fire before the lazy player is ready. Apply its latest
      // decision again once the engine has loaded instead of losing that event.
      if (inViewRef.current) lottieRef.current?.play();
      else lottieRef.current?.pause();
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('themed-lottie pointer-events-none', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Suspense fallback={<div aria-hidden className="size-full rounded-card bg-accent-soft animate-pulse motion-reduce:animate-none" />}>
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
