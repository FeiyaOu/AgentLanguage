import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button, Card, Chip, Field, Input, SegmentedControl } from '../ui';
import { LEVELS, PRACTICE_TOPICS, type Level } from '../content/suggestions';

export default function PracticeSetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get('topic') ?? '');
  const [level, setLevel] = useState<Level>('beginner');
  const [error, setError] = useState<string>();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Pick a suggestion or type a topic.');
      return;
    }
    navigate('/practice/session', { state: { topic: topic.trim(), difficulty: level } });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
      <header>
        <h1 className="text-title text-fg">Practice</h1>
        <p className="mt-2 text-body text-muted">Five quick questions on a topic of your choice.</p>
      </header>

      <Card padding="lg" className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="space-y-3">
            <Field label="Topic" error={error}>
              {(p) => (
                <Input
                  {...p}
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (error) setError(undefined);
                  }}
                  placeholder="e.g. Business phrasal verbs"
                />
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_TOPICS.slice(0, 4).map((t) => (
                <Chip
                  key={t}
                  size="sm"
                  selected={topic === t}
                  className={topic === t
                    ? 'bg-accent-soft text-accent-text border-accent-text ring-1 ring-accent-text'
                    : 'bg-accent-soft text-accent-text border-accent-line hover:border-accent-text hover:text-accent-text hover:bg-accent-soft'}
                  onClick={() => {
                    setTopic(t);
                    setError(undefined);
                  }}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-label text-fg">Level</div>
            <SegmentedControl label="Level" options={[...LEVELS]} value={level} onChange={setLevel} tone="accent" />
          </div>

          <Button type="submit" size="lg" block>
            Start practice
            <ArrowRightIcon className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
