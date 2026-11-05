import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Roleplay as RoleplayType, RoleplayMessage } from '../types';
import { startRoleplay, sendRoleplayMessage, getRoleplayHint, endRoleplay } from '../api';
import { FocusHeader } from '../components/FocusHeader';
import { Avatar, Button, ProgressBar, cn, toast } from '../ui';
import { Briefing, PreparingState } from '../roleplay/Briefing';
import { MissionStrip } from '../roleplay/MissionStrip';
import { MessageList } from '../roleplay/MessageList';
import { CoachDialog } from '../roleplay/CoachDialog';
import { EndDialog } from '../roleplay/EndDialog';

const MAX_MSG_WORDS = 100;
const MAX_HINTS = 3;
/** Let the learner read the final reply before the end dialog covers it. */
const END_DIALOG_DELAY_MS = 1400;

type RoleplayState = {
  topic: string;
  difficulty: string;
  personaType: string;
  customDescription?: string;
  personaName?: string;
  personaEmoji?: string;
};

type GoalStatus = 'in_progress' | 'off_track' | 'achieved';

type ApiError = { response?: { status?: number; data?: { detail?: string } } };

export default function Roleplay() {
  const location = useLocation();
  const state = location.state as RoleplayState | null;
  // Session config only exists in router state; after a refresh, start over.
  if (!state?.topic) return <Navigate to="/roleplay" replace />;
  return <RoleplaySession {...state} />;
}

function RoleplaySession({ topic, difficulty, personaType, customDescription, personaName, personaEmoji }: RoleplayState) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const [roleplay, setRoleplay] = useState<RoleplayType | null>(null);
  const [starting, setStarting] = useState(true);
  const [showBriefing, setShowBriefing] = useState(true);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);

  const [maxTurns, setMaxTurns] = useState(6);
  const [turnsRemaining, setTurnsRemaining] = useState(6);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalStatus, setGoalStatus] = useState<GoalStatus>('in_progress');
  const [achieved, setAchieved] = useState(false);
  const [sessionOver, setSessionOver] = useState(false);

  const [hintCount, setHintCount] = useState(0);
  const [gettingHint, setGettingHint] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<RoleplayMessage | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const nearBottom = useRef(true);

  const name = roleplay?.persona_name || personaName || 'Your partner';
  const ended = achieved || sessionOver || turnsRemaining <= 0;

  const begin = useCallback(async () => {
    try {
      const data = await startRoleplay(topic, difficulty, personaType, customDescription);
      const turns = typeof data.max_turns === 'number' && data.max_turns > 0 ? data.max_turns : 6;
      setRoleplay(data);
      setMessages([]);
      setTurnCount(0);
      setMaxTurns(turns);
      setTurnsRemaining(turns);
      setGoalProgress(0);
      setGoalStatus('in_progress');
      setAchieved(false);
      setSessionOver(false);
      setHintCount(0);
      setChatError(null);
      setEndOpen(false);
      setShowBriefing(true);
    } catch {
      toast.error("Couldn't start the conversation", { description: 'Please try again.' });
      navigate('/roleplay');
    } finally {
      setStarting(false);
    }
  }, [topic, difficulty, personaType, customDescription, navigate]);

  useEffect(() => {
    // Guard against StrictMode's double effect, which would create two sessions.
    if (started.current) return;
    started.current = true;
    void begin();
  }, [begin]);

  useEffect(() => {
    if (nearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, sending, showBriefing]);

  useEffect(() => {
    if (!ended || showBriefing) return;
    const timer = setTimeout(() => setEndOpen(true), END_DIALOG_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ended, showBriefing]);

  const applyGameState = (msg: RoleplayMessage) => {
    if (typeof msg.goal_progress === 'number') setGoalProgress(msg.goal_progress);
    if (msg.goal_status) setGoalStatus(msg.goal_status);
    if (typeof msg.turns_remaining === 'number') setTurnsRemaining(msg.turns_remaining);
    if (typeof msg.achieved === 'boolean') setAchieved(msg.achieved);
    if (msg.session_over) setSessionOver(true);
  };

  const startConversation = () => {
    if (!roleplay) return;
    setMessages([{ type: 'persona', text: roleplay.opening_line, timestamp: Date.now() }]);
    setShowBriefing(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || ended || !roleplay) return;

    const words = text.split(/\s+/).length;
    if (words > MAX_MSG_WORDS) {
      setChatError(`That's ${words} words — keep it under ${MAX_MSG_WORDS}.`);
      return;
    }
    setChatError(null);

    const nextTurn = turnCount + 1;
    setMessages((prev) => [...prev, { type: 'user', text, timestamp: Date.now() }]);
    setTurnCount(nextTurn);
    setInput('');
    setSending(true);

    try {
      const response = await sendRoleplayMessage(roleplay.roleplay_id, text, nextTurn);
      applyGameState(response);
      if (response.type === 'coach') setCoachFeedback(response);
      else setMessages((prev) => [...prev, response]);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err.response?.status === 429) {
        setChatError(err.response.data?.detail ?? "You're sending messages quickly. Wait a moment, then try again.");
      } else if (err.response?.status === 410) {
        setChatError('This conversation expired. Start a new one to keep practising.');
        setSessionOver(true);
      } else {
        setChatError("Your message didn't go through. Check your connection and try again.");
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const askCoach = async () => {
    if (!roleplay || gettingHint || ended || hintCount >= MAX_HINTS) return;
    setChatError(null);
    setGettingHint(true);
    try {
      const hint = await getRoleplayHint(roleplay.roleplay_id, turnCount);
      applyGameState(hint);
      setCoachFeedback(hint);
      setHintCount((n) => n + 1);
    } catch (error: unknown) {
      const err = error as ApiError;
      toast.error("The coach couldn't respond", {
        description: err.response?.status === 429 ? err.response.data?.detail : 'Please try again in a moment.',
      });
    } finally {
      setGettingHint(false);
    }
  };

  const closeCoach = () => {
    if (coachFeedback) {
      const notes: RoleplayMessage[] = [];
      if (coachFeedback.encouragement) {
        notes.push({ type: 'coach', text: coachFeedback.encouragement, timestamp: Date.now() });
      }
      if (coachFeedback.persona_resume) {
        notes.push({ type: 'persona', text: coachFeedback.persona_resume, timestamp: Date.now() });
      }
      setMessages((prev) => [...prev, ...notes]);
    }
    setCoachFeedback(null);
    inputRef.current?.focus();
  };

  const leave = async () => {
    if (roleplay) {
      try {
        await endRoleplay(roleplay.roleplay_id);
      } catch {
        // Leaving should never be blocked by a failed cleanup call.
      }
    }
    navigate('/roleplay');
  };

  const replay = () => {
    setStarting(true);
    void begin();
  };

  const avatar = <Avatar name={name} emoji={personaEmoji} size="sm" />;
  const hintsLeft = MAX_HINTS - hintCount;
  const progressTone = achieved || goalStatus === 'achieved' ? 'success' : goalStatus === 'off_track' ? 'warning' : 'accent';
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const phase = !roleplay ? 'starting' : showBriefing ? 'briefing' : 'chat';

  // One header instance across all phases: only its props change, so it never
  // remounts (a remount would replay its entrance animation and flash).
  const header =
    phase === 'starting' ? (
      <FocusHeader
        // The partner is already known from setup, so the header matches the briefing from the start.
        leading={personaName ? avatar : undefined}
        title={personaName ?? 'Preparing conversation'}
        subtitle={topic}
        onExit={() => navigate('/roleplay')}
        confirmExit={false}
      />
    ) : phase === 'briefing' ? (
      <FocusHeader leading={avatar} title={name} subtitle={topic} onExit={leave} confirmExit={false} />
    ) : (
      <FocusHeader
        leading={avatar}
        title={name}
        subtitle={topic}
        progress={
          <div className="hidden sm:block">
            <ProgressBar value={goalProgress} label="Mission progress" tone={progressTone} />
          </div>
        }
        actions={
          <>
            <span
              className={cn(
                'hidden text-caption tabular-nums sm:inline',
                turnsRemaining <= 2 ? 'font-medium text-warning' : 'text-muted',
              )}
            >
              {turnsRemaining} {turnsRemaining === 1 ? 'message' : 'messages'} left
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={askCoach}
              loading={gettingHint}
              disabled={ended || hintsLeft <= 0}
              aria-label={`Ask the coach, ${hintsLeft} hints left`}
            >
              <SparklesIcon className="size-4" />
              <span className="hidden sm:inline">Coach</span>
              <span className="tabular-nums text-muted">{hintsLeft}</span>
            </Button>
          </>
        }
        onExit={leave}
        exitTitle="Leave this conversation?"
        exitDescription="The conversation will end and won't be saved."
      />
    );

  return (
    <div className={cn(phase === 'chat' && 'flex h-dvh flex-col')}>
      {header}

      {phase === 'starting' && <PreparingState personaName={personaName} personaEmoji={personaEmoji} topic={topic} />}

      {phase === 'briefing' && roleplay && (
        <Briefing
          personaName={name}
          personaEmoji={personaEmoji}
          topic={topic}
          difficulty={difficulty}
          goal={roleplay.user_goal}
          scene={roleplay.scene_context}
          maxTurns={maxTurns}
          maxHints={MAX_HINTS}
          onStart={startConversation}
        />
      )}

      {phase === 'chat' && roleplay && (
        <>
          {/* On small screens the header has no room for progress, so it sits here. */}
          <div className="border-b border-line bg-surface px-4 py-2 sm:hidden">
            <div className="flex items-center gap-3">
              <ProgressBar value={goalProgress} label="Mission progress" tone={progressTone} />
              <span className={cn('shrink-0 text-caption tabular-nums', turnsRemaining <= 2 ? 'text-warning' : 'text-muted')}>
                {turnsRemaining} left
              </span>
            </div>
          </div>

          <MissionStrip goal={roleplay.user_goal} scene={roleplay.scene_context} />

          <div
            className="flex-1 overflow-y-auto"
            onScroll={(event) => {
              const container = event.currentTarget;
              nearBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
            }}
          >
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
              <MessageList messages={messages} personaName={name} personaEmoji={personaEmoji} typing={sending} />
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
              {chatError && (
                <p className="mb-2 rounded-control bg-danger-soft px-3 py-2 text-body-sm text-danger" role="alert">
                  {chatError}
                </p>
              )}
              <form onSubmit={send} className="flex items-center gap-2">
                <label htmlFor="roleplay-input" className="sr-only">
                  Your message
                </label>
                <input
                  id="roleplay-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ended ? 'Conversation finished' : `Reply to ${name}…`}
                  disabled={sending || ended}
                  autoComplete="off"
                  className={cn(
                    'h-11 min-w-0 flex-1 rounded-pill border border-line bg-canvas px-4 text-body text-fg placeholder:text-subtle outline-none',
                    'transition-[border-color,box-shadow] duration-fast focus:border-accent focus:ring-4 focus:ring-ring/15',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  disabled={!input.trim() || sending || ended}
                  className="size-11"
                >
                  <PaperAirplaneIcon className="size-5" />
                </Button>
              </form>
              {wordCount > MAX_MSG_WORDS * 0.8 && (
                <p className={cn('mt-1.5 text-right text-caption tabular-nums', wordCount > MAX_MSG_WORDS ? 'text-danger' : 'text-muted')}>
                  {wordCount}/{MAX_MSG_WORDS} words
                </p>
              )}
            </div>
          </div>

          <CoachDialog feedback={coachFeedback} hintsLeft={hintsLeft} onClose={closeCoach} />
          <EndDialog
            open={endOpen}
            achieved={achieved || goalStatus === 'achieved'}
            progress={goalProgress}
            replaying={starting}
            onReplay={replay}
            onFinish={leave}
          />
        </>
      )}
    </div>
  );
}
