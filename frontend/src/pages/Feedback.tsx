import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, BookmarkIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import type { ScoreResult, Exercise } from '../types';
import { useAuth } from '../auth/AuthContext';
import { Badge, Button, Card, buttonVariants } from '../ui';
import { isCorrect } from '../practice/grade';
import { ScoreSummary } from '../results/ScoreSummary';
import { ReviewList, type ReviewItem } from '../results/ReviewList';
import { TutorDialog } from '../results/TutorDialog';

type FeedbackState = {
  result: ScoreResult;
  topic: string;
  difficulty: string;
  exercises: Exercise[];
  answers: string[];
};

export default function Feedback() {
  const location = useLocation();
  const state = location.state as FeedbackState | null;
  // Results only exist in router state; after a refresh there is nothing to show.
  if (!state?.result) return <Navigate to="/practice" replace />;
  return <FeedbackView {...state} />;
}

/**
 * Builds the review list from what the learner actually answered, enriched with the
 * AI's per-question feedback where available — so the list is complete even if the
 * AI response is partial.
 */
function buildReview(result: ScoreResult, exercises: Exercise[], answers: string[]): ReviewItem[] {
  const byNum = new Map(result.detailed_scores.map((s) => [s.question_num, s]));
  if (!exercises?.length) {
    return result.detailed_scores.map((s) => ({
      num: s.question_num,
      question: s.question ?? '',
      userAnswer: s.user_answer ?? '',
      correctAnswer: s.correct_answer ?? '',
      correct: s.correct,
      feedback: s.feedback,
    }));
  }
  return exercises.map((ex, i) => {
    const ai = byNum.get(i + 1);
    const answer = answers[i] ?? '';
    const correct = ai?.correct ?? isCorrect(ex, answer);
    return {
      num: i + 1,
      question: ex.question,
      userAnswer: answer,
      correctAnswer: ex.correct_answer,
      correct,
      // Without AI feedback, the row already shows the correct answer; no need to repeat it.
      feedback: ai?.feedback ?? '',
    };
  });
}

function FeedbackView({ result, topic, difficulty, exercises, answers }: FeedbackState) {
  const navigate = useNavigate();
  const { status, openLogin } = useAuth();
  const [tutorItem, setTutorItem] = useState<ReviewItem | null>(null);

  const review = useMemo(() => buildReview(result, exercises, answers), [result, exercises, answers]);
  const correctCount = review.filter((r) => r.correct).length;
  const total = review.length || 1;
  const percentage = review.length ? Math.round((correctCount / total) * 100) : result.score_percentage;
  const weakAreas = result.weak_areas ?? [];

  const practiseWeakAreas = () => {
    const focusAreas = [...weakAreas];
    if (result.suggested_exercise_type) focusAreas.push(`preferred style: ${result.suggested_exercise_type}`);
    navigate('/practice/session', { state: { topic, difficulty, focusAreas } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6 sm:py-14">
      <ScoreSummary
        percentage={percentage}
        correct={correctCount}
        total={review.length}
        topic={topic}
        difficulty={difficulty}
        actions={
          <>
            <Button onClick={practiseWeakAreas}>
              <ArrowPathIcon className="size-4" />
              {weakAreas.length ? 'Practise weak areas' : 'Practise again'}
            </Button>
            <Link to="/practice" className={buttonVariants({ variant: 'secondary' })}>
              New topic
            </Link>
          </>
        }
      />

      {status === 'guest' && (
        <div className="flex flex-col gap-3 rounded-card border border-dashed border-line-strong px-5 py-4 sm:flex-row sm:items-center">
          <BookmarkIcon className="hidden size-5 shrink-0 text-muted sm:block" aria-hidden />
          <p className="flex-1 text-body-sm text-muted">Log in to save this result and review these questions later.</p>
          <Button variant="secondary" size="sm" onClick={openLogin} className="shrink-0 self-start sm:self-auto">
            Log in to save
          </Button>
        </div>
      )}

      {(weakAreas.length > 0 || result.recommendations) && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <LightBulbIcon className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-heading text-fg">What to focus on</h2>
              {weakAreas.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {weakAreas.map((area) => (
                    <li key={area}>
                      <Badge tone="accent" className="h-7 px-2.5 text-body-sm">
                        {area}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {result.recommendations && <p className="mt-3 text-body-sm text-muted">{result.recommendations}</p>}
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="review-heading" className="pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="review-heading" className="text-heading text-fg">
            Review
          </h2>
          <span className="text-caption text-subtle">
            {review.length - correctCount === 0 ? 'All correct' : `${review.length - correctCount} to review`}
          </span>
        </div>
        <ReviewList items={review} onAskTutor={setTutorItem} />
      </section>

      <TutorDialog item={tutorItem} onClose={() => setTutorItem(null)} />
    </div>
  );
}
