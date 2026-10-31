import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { askTutor } from '../api';
import { Button, Dialog, DialogContent, cn } from '../ui';
import type { ReviewItem } from './ReviewList';

const MAX_TURNS_PER_QUESTION = 3;
const MAX_TURNS_PER_SESSION = 15;
const MAX_WORDS_PER_MESSAGE = 50;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type TutorDialogProps = {
  item: ReviewItem | null;
  onClose: () => void;
};

/** Per-question follow-up chat. History and limits persist while the results page is open. */
export function TutorDialog({ item, onClose }: TutorDialogProps) {
  const [histories, setHistories] = useState<Record<number, ChatMessage[]>>({});
  const [turnCounts, setTurnCounts] = useState<Record<number, number>>({});
  const [sessionTurns, setSessionTurns] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const num = item?.num ?? -1;
  const history = histories[num] ?? [];
  const turns = turnCounts[num] ?? 0;
  const questionCap = turns >= MAX_TURNS_PER_QUESTION;
  const sessionCap = sessionTurns >= MAX_TURNS_PER_SESSION;
  const disabled = loading || questionCap || sessionCap;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length, loading]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!item || !text || disabled) return;

    const words = text.split(/\s+/).length;
    if (words > MAX_WORDS_PER_MESSAGE) {
      setError(`Keep your question under ${MAX_WORDS_PER_MESSAGE} words (it's ${words}).`);
      return;
    }

    setError(null);
    setLoading(true);
    setInput('');
    const withQuestion: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistories((prev) => ({ ...prev, [num]: withQuestion }));

    try {
      const { answer } = await askTutor(
        text,
        { question: item.question, user_answer: item.userAnswer, correct_answer: item.correctAnswer, feedback: item.feedback },
        history,
      );
      setHistories((prev) => ({ ...prev, [num]: [...withQuestion, { role: 'assistant', content: answer }] }));
      setTurnCounts((prev) => ({ ...prev, [num]: (prev[num] ?? 0) + 1 }));
      setSessionTurns((n) => n + 1);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
      // Roll back the optimistic question so it can be re-sent.
      setHistories((prev) => ({ ...prev, [num]: history }));
      setInput(text);
      setError(
        res?.status === 429
          ? (res.data?.detail ?? "You're asking quickly. Wait a moment, then try again.")
          : "The tutor couldn't answer right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const limitMessage = questionCap
    ? `You've used all ${MAX_TURNS_PER_QUESTION} follow-ups for this question. Try another one.`
    : sessionCap
      ? `You've reached ${MAX_TURNS_PER_SESSION} tutor questions for this practice. Start a new set to reset.`
      : null;

  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent title="Ask the tutor" description={item ? `Q${item.num}: ${item.question}` : undefined} className="max-w-lg">
        <div className="flex max-h-[55vh] min-h-48 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {history.length === 0 && (
              <p className="rounded-control bg-sunken px-3.5 py-3 text-body-sm text-muted">
                Ask anything about this question — for example, “Why is my answer wrong?” or “Can you explain the rule?”
              </p>
            )}
            {history.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.role === 'user' && 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-card px-3.5 py-2.5 text-body-sm',
                    msg.role === 'user' ? 'rounded-br-[6px] bg-accent text-accent-fg' : 'rounded-bl-[6px] bg-sunken text-fg',
                  )}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-1 self-start rounded-card rounded-bl-[6px] bg-sunken px-4 py-3 w-fit" role="status" aria-label="Tutor is typing">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="size-1.5 rounded-pill bg-subtle animate-bounce motion-reduce:animate-pulse" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {(error || limitMessage) && (
            <p
              className={cn(
                'mt-3 rounded-control px-3 py-2 text-body-sm',
                error ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
              )}
              role={error ? 'alert' : undefined}
            >
              {error ?? limitMessage}
            </p>
          )}

          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <label htmlFor="tutor-input" className="sr-only">
              Your question
            </label>
            <input
              id="tutor-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitMessage ? 'Limit reached' : 'Ask a follow-up…'}
              disabled={disabled}
              autoComplete="off"
              className={cn(
                'h-10 min-w-0 flex-1 rounded-pill border border-line bg-canvas px-4 text-body-sm text-fg placeholder:text-subtle outline-none',
                'transition-[border-color,box-shadow] duration-fast focus:border-accent focus:ring-4 focus:ring-ring/15',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={disabled || !input.trim()}>
              <PaperAirplaneIcon className="size-5" />
            </Button>
          </form>
          <p className="mt-2 text-caption text-subtle tabular-nums">
            {MAX_TURNS_PER_QUESTION - turns} follow-ups left for this question
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
