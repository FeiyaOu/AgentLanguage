import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, EmptyState, Skeleton, buttonVariants } from '../ui';
import { useAuth } from '../auth/AuthContext';
import { useHistory } from '../history/store';
import { formatWhen, startMistakesReview } from '../history/helpers';
import { ReviewList, type ReviewItem } from '../results/ReviewList';
import { TutorDialog } from '../results/TutorDialog';

export default function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const records = useHistory(user?.email);
  const record = records.find((r) => r.id === id);
  const [tutorItem, setTutorItem] = useState<ReviewItem | null>(null);

  const back = (
    <Link
      to="/history"
      className="inline-flex items-center gap-1.5 rounded-control text-body-sm text-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeftIcon className="size-4" />
      History
    </Link>
  );

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6 sm:py-16" aria-busy>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        {back}
        <EmptyState
          title="Session not found"
          description={status === 'guest' ? 'Log in to see your saved sessions.' : 'It may have been saved on another device or browser.'}
          action={
            <Link to="/history" className={buttonVariants({ variant: 'secondary' })}>
              Back to history
            </Link>
          }
        />
      </div>
    );
  }

  const wrongItems = record.review.filter((r) => !r.correct);
  const wrongMistakes = record.review.flatMap((item, i) =>
    !item.correct && record.exercises[i]
      ? [{ exercise: record.exercises[i], topic: record.topic, difficulty: record.difficulty }]
      : [],
  );
  const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6 sm:py-16">
      {back}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{record.topic}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-body-sm text-muted">
            <span>{formatWhen(record.createdAt)}</span>
            <span aria-hidden>·</span>
            <span className="capitalize">{record.difficulty}</span>
            <Badge tone={pct >= 80 ? 'success' : pct >= 50 ? 'accent' : 'warning'} className="tabular-nums">
              {record.correct}/{record.total} · {pct}%
            </Badge>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {wrongMistakes.length > 0 && (
            <Button onClick={() => startMistakesReview(navigate, wrongMistakes, `Mistakes: ${record.topic}`)}>
              <ArrowPathIcon className="size-4" />
              Retry {wrongMistakes.length} {wrongMistakes.length === 1 ? 'mistake' : 'mistakes'}
            </Button>
          )}
          <Link
            to={`/practice?topic=${encodeURIComponent(record.topic)}`}
            className={buttonVariants({ variant: 'secondary' })}
          >
            New set
          </Link>
        </div>
      </header>

      {(record.weakAreas.length > 0 || record.recommendations) && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <LightBulbIcon className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-heading text-fg">What to focus on</h2>
              {record.weakAreas.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {record.weakAreas.map((area) => (
                    <li key={area}>
                      <Badge tone="accent" className="h-7 px-2.5 text-body-sm">
                        {area}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {record.recommendations && <p className="mt-3 text-body-sm text-muted">{record.recommendations}</p>}
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="review-heading" className="pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="review-heading" className="text-heading text-fg">
            Questions
          </h2>
          <span className="text-caption text-subtle">
            {wrongItems.length === 0 ? 'All correct' : `${wrongItems.length} missed`}
          </span>
        </div>
        <ReviewList items={record.review} onAskTutor={setTutorItem} />
      </section>

      <TutorDialog item={tutorItem} onClose={() => setTutorItem(null)} />
    </div>
  );
}
