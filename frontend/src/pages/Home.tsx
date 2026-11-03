import { Link, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, ArrowRightIcon, ChatBubbleLeftRightIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { Button, Card, buttonVariants, cn } from '../ui';
import { useAuth } from '../auth/AuthContext';
import { PRACTICE_TOPICS, ROLEPLAY_SCENARIOS } from '../content/suggestions';
import { collectMistakes, useHistory } from '../history/store';
import { startMistakesReview } from '../history/helpers';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type EntryCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  to: string;
  cta: string;
  suggestions: string[];
};

function EntryCard({ icon: Icon, title, description, to, cta, suggestions }: EntryCardProps) {
  return (
    <Card padding="lg" className="flex flex-col">
      <div className="flex size-11 items-center justify-center rounded-control bg-accent-soft text-accent-text">
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-heading text-fg">{title}</h2>
      <p className="mt-1.5 text-body-sm text-muted">{description}</p>

      <div className="mt-6">
        <div className="mb-2.5 inline-flex rounded-pill bg-accent-soft px-2.5 py-1 text-caption font-medium text-accent-text">
          Common Topics
        </div>
        <ul className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <li key={s}>
              <Link
                to={`${to}?topic=${encodeURIComponent(s)}`}
                className={cn(
                  'inline-flex h-8 items-center rounded-pill border border-line bg-surface px-3 text-body-sm text-muted',
                  'transition-colors duration-fast ease-standard hover:border-line-strong hover:text-fg',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-8">
        <Link to={to} className={buttonVariants({ size: 'lg', block: true })}>
          {cta}
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </Card>
  );
}

export default function Home() {
  const { status, user, openLogin } = useAuth();
  const navigate = useNavigate();
  const mistakes = collectMistakes(useHistory(user?.email));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-title sm:text-display text-fg">
          {greeting()}
          {user ? `, ${user.name}` : ''}.
        </h1>
        <p className="mt-3 text-body text-muted">What would you like to practise today?</p>
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <EntryCard
          icon={PencilSquareIcon}
          title="Drills"
          description="Short quizzes on vocabulary and grammar for any topic, with feedback on every answer."
          to="/practice"
          cta="Start practice"
          suggestions={PRACTICE_TOPICS.slice(0, 3)}
        />
        <EntryCard
          icon={ChatBubbleLeftRightIcon}
          title="Roleplay"
          description="Hold a real conversation with an AI character and get coaching as you go."
          to="/roleplay"
          cta="Start a conversation"
          suggestions={ROLEPLAY_SCENARIOS.slice(0, 3)}
        />
      </div>

      {status === 'authenticated' && mistakes.length > 0 && (
        <Card padding="sm" className="mt-5 flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-fg">
            You have <span className="font-semibold">{mistakes.length}</span>{' '}
            {mistakes.length === 1 ? 'question' : 'questions'} to review from past practice.
          </p>
          <Button size="sm" onClick={() => startMistakesReview(navigate, mistakes)} className="shrink-0 self-start sm:self-auto">
            <ArrowPathIcon className="size-4" />
            Review mistakes
          </Button>
        </Card>
      )}

      {status === 'guest' && (
        <div className="mt-5 rounded-card border border-dashed border-line-strong px-5 py-4">
          <p className="text-body-sm leading-relaxed text-muted">
            You can practise without an account.{' '}
            <Button variant="secondary" size="sm" onClick={openLogin} className="mx-0.5 align-middle">
              Log in
            </Button>{' '}
            to save your results and review past questions.
          </p>
        </div>
      )}
    </div>
  );
}
