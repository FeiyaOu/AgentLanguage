import { LayoutGroup, motion } from 'framer-motion';
import { cn, spring } from '../ui';

export type Token = { id: number; text: string };
export type ReorderBoard = { available: Token[]; selected: Token[] };

type ReorderQuestionProps = {
  questionKey: string;
  prompt: string;
  board: ReorderBoard;
  verdict: boolean | null;
  onPick: (token: Token) => void;
  onUnpick: (token: Token) => void;
};

/**
 * Words move between the word bank and the answer line. Each token keeps a
 * stable layoutId, so Motion animates it flying from one area to the other.
 */
export function ReorderQuestion({ questionKey, prompt, board, verdict, onPick, onUnpick }: ReorderQuestionProps) {
  const checked = verdict !== null;

  const tokenClass = (inAnswer: boolean) =>
    cn(
      'h-10 rounded-control border px-3.5 text-body font-medium outline-none',
      'transition-[background-color,border-color,color] duration-fast ease-standard',
      'focus-visible:ring-2 focus-visible:ring-ring',
      inAnswer ? 'border-line-strong bg-surface text-fg' : 'border-line bg-surface text-fg hover:border-line-strong',
      checked && 'cursor-default',
    );

  return (
    <div>
      <h2 className="text-heading sm:text-title text-fg outline-none" data-question-heading tabIndex={-1}>
        {prompt}
      </h2>

      <LayoutGroup id={questionKey}>
        <div
          aria-label="Your sentence"
          className={cn(
            'mt-8 flex min-h-[4.5rem] flex-wrap content-start gap-2 rounded-card border-2 border-dashed p-3',
            'transition-colors duration-base',
            verdict === null && 'border-line-strong',
            verdict === true && 'border-success bg-success-soft',
            verdict === false && 'border-danger bg-danger-soft',
          )}
        >
          {board.selected.length === 0 && (
            <span className="self-center px-1 text-body-sm text-subtle">Tap the words below to build the sentence.</span>
          )}
          {board.selected.map((token) => (
            <motion.button
              key={token.id}
              layoutId={`token-${token.id}`}
              transition={spring.snappy}
              type="button"
              disabled={checked}
              onClick={() => onUnpick(token)}
              className={tokenClass(true)}
            >
              {token.text}
            </motion.button>
          ))}
        </div>

        <div aria-label="Word bank" className="mt-6 flex min-h-12 flex-wrap justify-center gap-2">
          {board.available.map((token) => (
            <motion.button
              key={token.id}
              layoutId={`token-${token.id}`}
              transition={spring.snappy}
              type="button"
              disabled={checked}
              onClick={() => onPick(token)}
              className={tokenClass(false)}
            >
              {token.text}
            </motion.button>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
