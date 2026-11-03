import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowPathIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, EmptyState, Skeleton, ThemedLottie, buttonVariants, cn, duration, ease } from '../ui';
import { WRITING_DRAWN_FRAME, writingAnimation } from '../content/animations';
import { useAuth } from '../auth/AuthContext';
import { collectMistakes, useHistory, type PracticeRecord } from '../history/store';
import { formatWhen, startMistakesReview } from '../history/helpers';

function scoreTone(pct: number) {
  return pct >= 80 ? 'success' : pct >= 50 ? 'accent' : 'warning';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-title tabular-nums text-fg">{value}</div>
      <div className="text-caption text-muted">{label}</div>
    </div>
  );
}

function RecordRow({ record, index }: { record: PracticeRecord; index: number }) {
  const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;
  const wrong = record.total - record.correct;
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.enter, delay: Math.min(index, 8) * 0.03 }}
    >
      <Link
        to={`/history/${record.id}`}
        className={cn(
          'flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3.5 outline-none',
          'transition-colors duration-fast ease-standard hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium text-fg">{record.topic}</div>
          <div className="mt-0.5 text-caption text-muted">
            {formatWhen(record.createdAt)} · <span className="capitalize">{record.difficulty}</span>
            {wrong > 0 && ` · ${wrong} missed`}
          </div>
        </div>
        <Badge tone={scoreTone(pct)} className="tabular-nums">
          {record.correct}/{record.total}
        </Badge>
        <ChevronRightIcon className="size-4 shrink-0 text-subtle" aria-hidden />
      </Link>
    </motion.li>
  );
}

const emptyVisual = (
  <ThemedLottie animationData={writingAnimation} segment={[0, WRITING_DRAWN_FRAME]} className="size-28" />
);

export default function History() {
  const { status, user, openLogin } = useAuth();
  const navigate = useNavigate();
  const records = useHistory(user?.email);
  const mistakes = collectMistakes(records);
  const average = records.length
    ? Math.round((records.reduce((sum, r) => sum + (r.total ? r.correct / r.total : 0), 0) / records.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
      <header>
        <h1 className="text-title text-fg">History</h1>
        <p className="mt-2 text-body text-muted">Your past practice sessions and questions to review.</p>
      </header>

      <div className="mt-8">
        {status === 'loading' && (
          <div className="space-y-3" aria-busy>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm" className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-10 rounded-pill" />
              </Card>
            ))}
          </div>
        )}

        {status === 'guest' && (
          <Card padding="none">
            <EmptyState
              visual={emptyVisual}
              title="Log in to keep your history"
              description="You can practise without an account, but results aren't saved. Log in to review past questions anytime."
              action={<Button onClick={openLogin}>Log in</Button>}
            />
          </Card>
        )}

        {status === 'authenticated' && records.length === 0 && (
          <Card padding="none">
            <EmptyState
              visual={emptyVisual}
              title="No practice saved yet"
              description="Finish a practice set and it will show up here."
              action={
                <Link to="/practice" className={buttonVariants()}>
                  Start practising
                </Link>
              }
            />
          </Card>
        )}

        {status === 'authenticated' && records.length > 0 && (
          <div className="space-y-8">
            <Card padding="md" className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="grid flex-1 grid-cols-3 gap-4">
                <Stat label="Sessions" value={String(records.length)} />
                <Stat label="Average score" value={`${average}%`} />
                <Stat label="To review" value={String(mistakes.length)} />
              </div>
              <Button onClick={() => startMistakesReview(navigate, mistakes)} disabled={mistakes.length === 0}>
                <ArrowPathIcon className="size-4" />
                {mistakes.length ? 'Review mistakes' : 'Nothing to review'}
              </Button>
            </Card>

            <section aria-labelledby="sessions-heading">
              <h2 id="sessions-heading" className="mb-3 text-heading text-fg">
                Sessions
              </h2>
              <ul className="space-y-2">
                {records.map((record, i) => (
                  <RecordRow key={record.id} record={record} index={i} />
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
