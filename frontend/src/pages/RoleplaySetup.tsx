import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowPathIcon, ArrowRightIcon, PencilIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { suggestPersonas } from '../api';
import type { SuggestedPersona } from '../types';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Field,
  Input,
  SegmentedControl,
  Textarea,
  cn,
  duration,
  ease,
} from '../ui';
import { LEVELS, ROLEPLAY_SCENARIOS, type Level } from '../content/suggestions';
import { CastingCard } from '../roleplay/CastingCard';

const CUSTOM = 'custom';

export default function RoleplaySetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [scenario, setScenario] = useState(params.get('topic') ?? '');
  const [level, setLevel] = useState<Level>('beginner');
  const [personas, setPersonas] = useState<SuggestedPersona[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [personaError, setPersonaError] = useState<string>();
  const [scenarioError, setScenarioError] = useState<string>();
  const [partnerError, setPartnerError] = useState<string>();

  const resetPartners = () => {
    setPersonas([]);
    setSelected(null);
    setPersonaError(undefined);
  };

  const changeScenario = (value: string) => {
    setScenario(value);
    setScenarioError(undefined);
    if (personas.length || selected) resetPartners();
  };

  const findPartners = async () => {
    if (!scenario.trim()) {
      setScenarioError('Pick a suggestion or describe a scenario first.');
      return;
    }
    setLoadingPersonas(true);
    setPersonaError(undefined);
    setPartnerError(undefined);
    setPersonas([]);
    setSelected(null);
    try {
      setPersonas(await suggestPersonas(scenario.trim(), level));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setPersonaError(
        status === 429
          ? "You've searched a lot in a short time. Wait a moment, then try again."
          : "Couldn't find partners right now. Check your connection and try again.",
      );
    } finally {
      setLoadingPersonas(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!scenario.trim()) {
      setScenarioError('Pick a suggestion or describe a scenario first.');
      return;
    }
    const persona = personas.find((p) => p.id === selected);
    if (!persona && !(selected === CUSTOM && customDescription.trim())) {
      setPartnerError(selected === CUSTOM ? 'Describe your partner in a few words.' : 'Choose a conversation partner.');
      return;
    }
    navigate('/roleplay/session', {
      state: {
        topic: scenario.trim(),
        difficulty: level,
        personaType: 'custom',
        customDescription: persona ? `${persona.name} — ${persona.traits}` : customDescription.trim(),
        personaName: persona?.name,
        personaEmoji: persona?.emoji,
      },
    });
  };

  const showPartners = loadingPersonas || personas.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
      <header>
        <h1 className="text-title text-fg">Roleplay</h1>
        <p className="mt-2 text-body text-muted">Practise a real conversation with an AI character.</p>
      </header>

      <Card padding="lg" className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="space-y-3">
            <Field label="Scenario" error={scenarioError}>
              {(p) => (
                <Input
                  {...p}
                  value={scenario}
                  onChange={(e) => changeScenario(e.target.value)}
                  placeholder="e.g. Checking into a hotel"
                />
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              {ROLEPLAY_SCENARIOS.map((s) => (
                <Chip key={s} size="sm" selected={scenario === s} onClick={() => changeScenario(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-label text-fg">Level</div>
            <SegmentedControl label="Level" options={[...LEVELS]} value={level} onChange={setLevel} />
            <p className="text-caption text-muted">{LEVELS.find((l) => l.value === level)?.description}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-label text-fg">Conversation partner</div>
              {personas.length > 0 && (
                <Button variant="ghost" size="sm" onClick={findPartners} className="-mr-2">
                  <ArrowPathIcon className="size-4" />
                  Refresh
                </Button>
              )}
            </div>

            {!showPartners && (
              <Button variant="secondary" block onClick={findPartners} className="h-12 border-dashed">
                <UserGroupIcon className="size-5" />
                Find conversation partners
              </Button>
            )}

            {personaError && (
              <div className="flex flex-col gap-3 rounded-control bg-danger-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm text-danger">{personaError}</p>
                <Button variant="secondary" size="sm" onClick={findPartners} className="shrink-0 self-start sm:self-auto">
                  Try again
                </Button>
              </div>
            )}

            {showPartners && (
              <div className="relative">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy={loadingPersonas}>
                  {Array.from({ length: loadingPersonas ? 4 : personas.length }).map((_, i) => {
                    const p = loadingPersonas ? undefined : personas[i];
                    return (
                      // Skeleton and card share one grid cell, so the swap is a cross-fade
                      // in place: no empty frame, no layout jump.
                      <div key={i} className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                        <AnimatePresence>
                          {!p ? (
                            <motion.div
                              key="skeleton"
                              initial={{ opacity: 0.4, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, transition: { duration: duration.fast } }}
                              transition={{ duration: duration.base, ease: ease.enter, delay: i * 0.06 }}
                            >
                              <CastingCard index={i} />
                            </motion.div>
                          ) : (
                            <motion.button
                              key={p.id}
                              type="button"
                              aria-pressed={selected === p.id}
                              onClick={() => {
                                setSelected(p.id);
                                setPartnerError(undefined);
                              }}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: duration.base, ease: ease.enter, delay: i * 0.06 }}
                              className={cn(
                                'rounded-card border p-4 text-left outline-none',
                                'transition-colors duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-ring',
                                selected === p.id
                                  ? 'border-accent bg-accent-soft'
                                  : 'border-line bg-surface hover:border-line-strong',
                              )}
                            >
                              <Avatar name={p.name} emoji={p.emoji} />
                              <div className="mt-3 text-body-sm font-semibold text-fg">{p.name}</div>
                              <div className="mt-1 text-caption text-muted line-clamp-2">{p.traits}</div>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {personas.length > 0 && (
              <button
                type="button"
                aria-pressed={selected === CUSTOM}
                onClick={() => {
                  setSelected(CUSTOM);
                  setPartnerError(undefined);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-card border px-4 py-3 text-body-sm outline-none',
                  'transition-colors duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-ring',
                  selected === CUSTOM
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-fg',
                )}
              >
                <PencilIcon className="size-4" />
                Describe your own partner
              </button>
            )}

            <AnimatePresence initial={false}>
              {selected === CUSTOM && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: duration.base, ease: ease.standard }}
                  className="overflow-hidden"
                >
                  <Textarea
                    aria-label="Describe your partner"
                    value={customDescription}
                    onChange={(e) => {
                      setCustomDescription(e.target.value);
                      setPartnerError(undefined);
                    }}
                    placeholder="An impatient chef who hates processed food…"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {partnerError && <p className="text-caption text-danger">{partnerError}</p>}
          </div>

          <Button type="submit" size="lg" block disabled={loadingPersonas}>
            Start conversation
            <ArrowRightIcon className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
