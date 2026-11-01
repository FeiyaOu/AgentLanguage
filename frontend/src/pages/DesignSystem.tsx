import { useState, type ReactNode } from 'react';
import { InboxIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  EmptyState,
  Field,
  Input,
  LevelBadge,
  ProgressBar,
  ProgressRing,
  SegmentedProgress,
  Skeleton,
  SkeletonText,
  Spinner,
  Textarea,
  toast,
  ThemedLottie,
  celebrate,
  type SegmentState,
} from '../ui';
import { AnimatedMark } from '../practice/AnimatedMark';
import { WRITING_DRAWN_FRAME, successAnimation, writingAnimation } from '../content/animations';

/** Live style guide: every token and component state in one place. */

const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Surfaces', tokens: ['canvas', 'surface', 'sunken', 'raised', 'line', 'line-strong'] },
  { title: 'Text', tokens: ['fg', 'muted', 'subtle'] },
  { title: 'Accent', tokens: ['accent', 'accent-hover', 'accent-soft', 'accent-line', 'accent-text'] },
  {
    title: 'Feedback',
    tokens: ['success', 'success-soft', 'danger', 'danger-soft', 'warning', 'warning-soft'],
  },
];

const typeScale = [
  { name: 'display', className: 'text-display', sample: 'Speak with confidence' },
  { name: 'title', className: 'text-title', sample: 'Ordering at a café' },
  { name: 'heading', className: 'text-heading', sample: 'Question 2 of 5' },
  { name: 'body', className: 'text-body', sample: 'Choose the most natural reply to the waiter.' },
  { name: 'body-sm', className: 'text-body-sm', sample: 'Your answer was close — check the article.' },
  { name: 'label', className: 'text-label', sample: 'Proficiency level' },
  { name: 'caption', className: 'text-caption', sample: 'About 5 minutes' },
];

const motionTokens = [
  { name: 'fast · 150ms', className: 'duration-fast', use: 'Hover, press, small state changes' },
  { name: 'base · 250ms', className: 'duration-base', use: 'Dialogs, cards entering, toasts' },
  { name: 'slow · 400ms', className: 'duration-slow', use: 'Page transitions, progress' },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="py-10 border-t border-line first:border-t-0">
      <h2 className="text-heading text-fg">{title}</h2>
      {description && <p className="mt-1 text-body-sm text-muted max-w-2xl">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 py-3">
      <div className="w-28 shrink-0 text-caption text-subtle">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function DesignSystem() {
  const [progress, setProgress] = useState(64);
  const [motionPlayed, setMotionPlayed] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('Job interview');
  const [loading, setLoading] = useState(false);
  const [replay, setReplay] = useState(0);
  const segments: SegmentState[] = ['correct', 'incorrect', 'correct', 'current', 'upcoming'];

  const fakeSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Answers checked', { description: '4 of 5 correct' });
    }, 1400);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <header className="mb-4">
        <Badge tone="accent">Design system</Badge>
        <h1 className="mt-3 text-title sm:text-display text-fg">AgentLanguage UI</h1>
        <p className="mt-2 text-body text-muted max-w-2xl">
          Tokens and components used across the app. Toggle the theme to see the semantic layer swap — components
          never reference raw palette values.
        </p>
      </header>

      <Section title="Color" description="Semantic tokens. Dark mode replaces these values only.">
        <div className="grid gap-8 sm:grid-cols-2">
          {colorGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-label text-muted mb-3">{group.title}</h3>
              <div className="grid grid-cols-3 gap-3">
                {group.tokens.map((t) => (
                  <div key={t}>
                    <div
                      className="h-14 rounded-control border border-line"
                      style={{ backgroundColor: `rgb(var(--color-${t}))` }}
                    />
                    <div className="mt-1.5 text-caption text-muted font-mono">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" description="Inter Variable. Seven named steps; size, line height and weight travel together.">
        <div className="divide-y divide-line">
          {typeScale.map((t) => (
            <div key={t.name} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6 py-3">
              <div className="w-20 shrink-0 text-caption text-subtle font-mono">{t.name}</div>
              <div className={`${t.className} text-fg`}>{t.sample}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius & elevation" description="Controls use control, cards use card, chips and avatars use pill. Level 1 is a border; shadows are for overlays only.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-control bg-surface border border-line flex items-end p-3 text-caption text-muted">rounded-control · 10px</div>
          <div className="h-24 rounded-card bg-surface border border-line flex items-end p-3 text-caption text-muted">rounded-card · 16px · level 1</div>
          <div className="h-24 rounded-card bg-raised border border-line shadow-overlay flex items-end p-3 text-caption text-muted">shadow-overlay · level 2</div>
        </div>
      </Section>

      <Section title="Motion" description="Durations and easing curves are tokens too. Motion is used for feedback, orientation and continuity — loops only while loading.">
        <div className="space-y-4">
          {motionTokens.map((m) => (
            <div key={m.name} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-28 shrink-0">
                <div className="text-caption text-fg font-mono">{m.name}</div>
                <div className="text-caption text-subtle">{m.use}</div>
              </div>
              <div className="relative h-10 flex-1 rounded-pill bg-sunken [container-type:inline-size]">
                <div
                  className={`absolute top-1 left-1 size-8 rounded-pill bg-accent transition-transform ease-standard motion-reduce:transition-none ${m.className}`}
                  style={{ transform: motionPlayed ? 'translateX(calc(100cqw - 2.5rem))' : 'none' }}
                />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setMotionPlayed((p) => !p)}>
            Play
          </Button>
        </div>
      </Section>

      <Section
        title="Motion in use"
        description="Each animation answers a question for the learner: did my action work, where am I, where did this come from. Everything respects prefers-reduced-motion."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex flex-col items-center gap-3 text-center">
            <ThemedLottie key={`s-${replay}`} animationData={successAnimation} label="Success animation" className="size-28" />
            <div>
              <div className="text-label text-fg">Lottie · success</div>
              <div className="text-caption text-muted">Mission complete. Plays once.</div>
            </div>
          </Card>
          <Card className="flex flex-col items-center gap-3 text-center">
            <ThemedLottie
              animationData={writingAnimation}
              loop
              reducedMotionFrame={WRITING_DRAWN_FRAME}
              label="Writing animation"
              className="size-28"
            />
            <div>
              <div className="text-label text-fg">Lottie · writing</div>
              <div className="text-caption text-muted">Generating questions. Loops, pauses off-screen.</div>
            </div>
          </Card>
          <Card className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex gap-3" key={`m-${replay}`}>
              <AnimatedMark correct />
              <AnimatedMark correct={false} />
            </div>
            <div>
              <div className="text-label text-fg">Answer feedback</div>
              <div className="text-caption text-muted">SVG paths draw in via pathLength.</div>
            </div>
          </Card>
        </div>
        <p className="mt-4 text-caption text-muted">
          Lottie fills and strokes are named after tokens (accent, surface…) and recolored at runtime, so the same file
          follows light and dark themes.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setReplay((r) => r + 1)}>
            Replay
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void celebrate()}>
            Celebrate
          </Button>
        </div>
      </Section>

      <Section title="Button" description="States: default, hover, pressed, focus-visible, disabled, loading. Loading keeps the width so layout doesn't jump.">
        <Row label="Variants">
          <Button>Start practice</Button>
          <Button variant="secondary">New topic</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">End session</Button>
        </Row>
        <Row label="Sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">
            Large <ArrowRightIcon className="size-4" />
          </Button>
          <Button size="icon" variant="secondary" aria-label="Ask coach">
            <SparklesIcon className="size-5" />
          </Button>
        </Row>
        <Row label="States">
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button loading={loading} onClick={fakeSubmit}>
            Check answers
          </Button>
        </Row>
      </Section>

      <Section title="Chip & badge" description="Chips are toggleable (aria-pressed). Badges are static labels. Difficulty uses dots instead of a color per level.">
        <Row label="Chips">
          {['Job interview', 'Ordering coffee', 'Doctor visit', 'Hotel check-in'].map((t) => (
            <Chip key={t} selected={selectedTopic === t} onClick={() => setSelectedTopic(t)}>
              {t}
            </Chip>
          ))}
          <Chip disabled>Disabled</Chip>
        </Row>
        <Row label="Badges">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Correct</Badge>
          <Badge tone="danger">Incorrect</Badge>
          <Badge tone="warning">Off track</Badge>
        </Row>
        <Row label="Level">
          <LevelBadge level="beginner" />
          <LevelBadge level="intermediate" />
          <LevelBadge level="advanced" />
        </Row>
      </Section>

      <Section title="Input" description="States: default, hover, focus, invalid, disabled. Field wires label, hint and error for screen readers.">
        <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
          <Field label="Topic" hint="Anything you want to practise.">
            {(p) => <Input {...p} placeholder="e.g. Business phrasal verbs" />}
          </Field>
          <Field label="Topic" error="Please enter a topic.">
            {(p) => <Input {...p} defaultValue="" placeholder="e.g. Business phrasal verbs" />}
          </Field>
          <Field label="Disabled">{(p) => <Input {...p} disabled placeholder="Not available" />}</Field>
          <Field label="Custom partner">
            {(p) => <Textarea {...p} placeholder="An impatient chef who hates processed food…" />}
          </Field>
        </div>
      </Section>

      <Section title="Progress" description="Bar for continuous progress, segments for step-by-step, ring for a final score.">
        <div className="space-y-6 max-w-xl">
          <div>
            <div className="flex justify-between text-caption text-muted mb-2">
              <span>Mission progress</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} label="Mission progress" tone={progress >= 100 ? 'success' : 'accent'} />
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="mt-3 w-full accent-[rgb(var(--color-accent))]"
              aria-label="Adjust demo progress"
            />
          </div>
          <SegmentedProgress segments={segments} label="Question progress" />
          <ProgressRing value={progress} label="Score" tone={progress >= 80 ? 'success' : progress >= 50 ? 'accent' : 'danger'}>
            <span className="text-title text-fg">{progress}%</span>
          </ProgressRing>
        </div>
      </Section>

      <Section title="Loading" description="Skeletons for content with a known shape; spinners only inside controls.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-pill" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <SkeletonText lines={3} />
          </Card>
          <Card className="flex items-center justify-center gap-3 text-muted">
            <Spinner />
            <span className="text-body-sm">Spinner (inherits text color)</span>
          </Card>
        </div>
      </Section>

      <Section title="Avatar" description="Solid for the signed-in user, soft (tinted) for initials or a persona's emoji.">
        <Row label="Sizes">
          <Avatar name="Sophie Ou" size="sm" />
          <Avatar name="Sophie Ou" />
          <Avatar name="Sophie Ou" size="lg" />
        </Row>
        <Row label="User (solid)">
          <Avatar name="Sophie Ou" size="sm" tone="solid" />
          <Avatar name="Sophie Ou" tone="solid" />
          <Avatar name="Sophie Ou" size="lg" tone="solid" />
        </Row>
        <Row label="Persona">
          <Avatar name="Marco the waiter" emoji="🧑‍🍳" />
          <Avatar name="Ms. Chen" emoji="👩‍🏫" size="lg" />
        </Row>
      </Section>

      <Section title="Overlays" description="Dialog uses Radix for focus trap, Escape and scroll lock; enter/exit are CSS keyframes. Toasts replace alert().">
        <Row label="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Leave practice</Button>
            </DialogTrigger>
            <DialogContent title="Leave this practice?" description="Your answers so far won't be saved.">
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Keep going</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">Leave</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </Row>
        <Row label="Toast">
          <Button variant="secondary" onClick={() => toast('Signed out')}>
            Neutral
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Saved to your history')}>
            Success
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.error("Couldn't generate questions", {
                description: 'Check your connection and try again.',
                action: { label: 'Retry', onClick: () => {} },
              })
            }
          >
            Error with action
          </Button>
        </Row>
      </Section>

      <Section title="Empty state">
        <Card padding="none">
          <EmptyState
            visual={<InboxIcon className="size-10" />}
            title="No practice history yet"
            description="Log in to keep your results and review past questions."
            action={<Button>Log in</Button>}
          />
        </Card>
      </Section>
    </div>
  );
}
