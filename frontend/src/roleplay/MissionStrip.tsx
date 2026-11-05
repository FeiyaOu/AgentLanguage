import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, FlagIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui';

/** One-line mission reminder; expands to show the scene. Keeps the chat area tall. */
export function MissionStrip({ goal, scene }: { goal: string; scene: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-control"
        >
          <FlagIcon className="size-4 shrink-0 text-accent-text" aria-hidden />
          <span className={cn('min-w-0 flex-1 text-body-sm text-fg', !open && 'truncate')}>
            <span className="font-medium">Mission: </span>
            {goal}
          </span>
          <ChevronDownIcon
            className={cn('size-4 shrink-0 text-muted transition-transform duration-base ease-standard', open && 'rotate-180')}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {open && scene && (
            <motion.div
              id={panelId}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <p className="pb-3 pl-[26px] text-body-sm text-muted">{scene}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
