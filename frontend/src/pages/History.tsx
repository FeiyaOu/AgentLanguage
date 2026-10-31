import { Link } from 'react-router-dom';
import { ClockIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Button, Card, EmptyState, Skeleton, buttonVariants } from '../ui';
import { useAuth } from '../auth/AuthContext';

export default function History() {
  const { status, openLogin } = useAuth();

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
                <Skeleton className="size-10 rounded-control" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {status === 'guest' && (
          <Card padding="none">
            <EmptyState
              visual={<LockClosedIcon className="size-10" />}
              title="Log in to keep your history"
              description="You can practise without an account, but results aren't saved. Log in to review past questions anytime."
              action={<Button onClick={openLogin}>Log in</Button>}
            />
          </Card>
        )}

        {status === 'authenticated' && (
          <Card padding="none">
            <EmptyState
              visual={<ClockIcon className="size-10" />}
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
      </div>
    </div>
  );
}
