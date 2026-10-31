import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { RoleplayMessage } from '../types';
import { Avatar, cn, spring } from '../ui';

type MessageListProps = {
  messages: RoleplayMessage[];
  personaName: string;
  personaEmoji?: string;
  typing: boolean;
};

function TypingIndicator({ personaName, personaEmoji }: { personaName: string; personaEmoji?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2.5"
      role="status"
      aria-label={`${personaName} is typing`}
    >
      <Avatar name={personaName} emoji={personaEmoji} size="sm" />
      <div className="flex gap-1 rounded-card rounded-bl-[6px] border border-line bg-surface px-4 py-3.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-pill bg-subtle animate-bounce motion-reduce:animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/** Chat transcript. Bubbles enter from their speaker's side. */
export function MessageList({ messages, personaName, personaEmoji, typing }: MessageListProps) {
  return (
    <div className="space-y-4" aria-live="polite" aria-relevant="additions">
      {messages.map((msg, i) => {
        if (msg.type === 'system' || msg.type === 'coach') {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div
                className={cn(
                  'flex max-w-[90%] items-start gap-2 rounded-card px-3.5 py-2 text-body-sm',
                  msg.type === 'coach' ? 'bg-accent-soft text-fg' : 'bg-sunken text-muted',
                )}
              >
                {msg.type === 'coach' && <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />}
                <span>
                  {msg.type === 'coach' && <span className="sr-only">Coach: </span>}
                  {msg.text}
                </span>
              </div>
            </motion.div>
          );
        }

        const isUser = msg.type === 'user';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: isUser ? 16 : -16, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={spring.gentle}
            className={cn('flex items-end gap-2.5', isUser && 'justify-end')}
          >
            {!isUser && <Avatar name={personaName} emoji={personaEmoji} size="sm" />}
            <div
              className={cn(
                'max-w-[80%] whitespace-pre-wrap rounded-card px-4 py-2.5 text-body',
                isUser
                  ? 'rounded-br-[6px] bg-accent text-accent-fg'
                  : 'rounded-bl-[6px] border border-line bg-surface text-fg',
              )}
            >
              <span className="sr-only">{isUser ? 'You: ' : `${personaName}: `}</span>
              {msg.text}
            </div>
          </motion.div>
        );
      })}
      {typing && <TypingIndicator personaName={personaName} personaEmoji={personaEmoji} />}
    </div>
  );
}
