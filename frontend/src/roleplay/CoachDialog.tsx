import type { ReactNode } from 'react';
import type { RoleplayMessage } from '../types';
import { Button, Dialog, DialogContent, ProgressBar } from '../ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-label text-muted">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

type CoachDialogProps = {
  feedback: RoleplayMessage | null;
  hintsLeft: number;
  onClose: () => void;
};

/** Coach breakdown: next move first, then grammar, vocabulary and tone. */
export function CoachDialog({ feedback, hintsLeft, onClose }: CoachDialogProps) {
  return (
    <Dialog open={!!feedback} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Coach notes"
        description={`${hintsLeft} hint${hintsLeft === 1 ? '' : 's'} left in this conversation`}
        className="max-w-lg"
      >
        {feedback && (
          <div className="space-y-6">
            {feedback.encouragement && (
              <div className="rounded-card border border-accent-line bg-accent-soft p-4">
                <h3 className="text-label text-accent-text">Try next</h3>
                <p className="mt-1 text-body text-fg">{feedback.encouragement}</p>
              </div>
            )}

            {!!feedback.grammar_notes?.length && (
              <Section title="Grammar">
                <ul className="space-y-2">
                  {feedback.grammar_notes.map((note, i) => (
                    <li key={i} className="rounded-control bg-sunken px-3 py-2 text-body-sm text-fg">
                      {note}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {!!feedback.vocab_suggestions?.length && (
              <Section title="Useful phrases">
                <ul className="space-y-2">
                  {feedback.vocab_suggestions.map((tip, i) => (
                    <li key={i} className="rounded-control bg-sunken px-3 py-2 text-body-sm text-fg">
                      {tip}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {typeof feedback.politeness_score === 'number' && (
              <Section title="Politeness">
                <div className="flex items-center gap-3">
                  <ProgressBar
                    value={feedback.politeness_score}
                    label="Politeness"
                    tone={feedback.politeness_score >= 70 ? 'success' : feedback.politeness_score >= 50 ? 'warning' : 'danger'}
                  />
                  <span className="text-body-sm font-medium tabular-nums text-fg">{feedback.politeness_score}</span>
                </div>
              </Section>
            )}

            <Button block onClick={onClose}>
              Back to conversation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
