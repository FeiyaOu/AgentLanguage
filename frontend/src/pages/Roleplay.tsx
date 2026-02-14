import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Roleplay as RoleplayType, RoleplayMessage } from '../types';
import { startRoleplay, sendRoleplayMessage, getRoleplayHint, endRoleplay } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon, 
  UserIcon, 
  CpuChipIcon, 
  SparklesIcon,
  XMarkIcon,
  BoltIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'; // Updated import path

export default function Roleplay() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // --- Constants ---
  const MAX_MSG_WORDS = 100;
  const MAX_HINTS = 3;

  const { topic, difficulty, personaType, customDescription } = location.state as {
    topic: string;
    difficulty: string;
    personaType: string;
    customDescription?: string;
  } || {};

  const [roleplay, setRoleplay] = useState<RoleplayType | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<RoleplayMessage | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [gettingHint, setGettingHint] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);

  const [maxTurns, setMaxTurns] = useState(6);
  const [turnsRemaining, setTurnsRemaining] = useState(6);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalStatus, setGoalStatus] = useState<'in_progress' | 'off_track' | 'achieved'>('in_progress');
  const [achieved, setAchieved] = useState(false);
  const [sessionOver, setSessionOver] = useState(false);
  const [progressPulse, setProgressPulse] = useState(0);

  useEffect(() => {
    if (!topic) {
      navigate('/');
      return;
    }
    initializeRoleplay();
  }, [topic, difficulty, personaType, customDescription]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeRoleplay = async () => {
    try {
      setLoading(true);
      const data = await startRoleplay(topic, difficulty, personaType, customDescription);
      setRoleplay(data);
      setMessages([]);
      setTurnCount(0);
      setShowBriefing(true);
      const mt = typeof data.max_turns === 'number' && data.max_turns > 0 ? data.max_turns : 6;
      setMaxTurns(mt);
      setTurnsRemaining(mt);
      setGoalProgress(0);
      setGoalStatus('in_progress');
      setAchieved(false);
      setSessionOver(false);
      setProgressPulse(0);
      setHintCount(0);
      setChatError(null);
    } catch (error) {
      console.error('Error starting roleplay:', error);
      alert('Failed to start roleplay. Please try again.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (!roleplay) return;
    setMessages([
      {
        type: 'persona',
        text: roleplay.opening_line,
        timestamp: Date.now(),
      },
    ]);
    setShowBriefing(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;
    if (sessionOver || achieved || turnsRemaining <= 0) return;

    // Word-count guard
    const wordCount = inputMessage.trim().split(/\s+/).length;
    if (wordCount > MAX_MSG_WORDS) {
      setChatError(`Message too long (${wordCount} words). Keep it under ${MAX_MSG_WORDS} words.`);
      return;
    }
    setChatError(null);

    if (!roleplay) return;

    const userMsg: RoleplayMessage = {
      type: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);
    setInputMessage('');
    setSending(true);

    try {
      // Simulate slight delay for realism
      await new Promise(r => setTimeout(r, 600)); 

      const response = await sendRoleplayMessage(roleplay.roleplay_id, inputMessage, newTurnCount);

      if (typeof response.goal_progress === 'number') {
        setGoalProgress(response.goal_progress);
        setProgressPulse(prev => prev + 1);
      }
      if (response.goal_status) setGoalStatus(response.goal_status);
      if (typeof response.turns_remaining === 'number') setTurnsRemaining(response.turns_remaining);
      if (typeof response.achieved === 'boolean') setAchieved(response.achieved);
      if (response.session_over) setSessionOver(true);
      
      // If coach feedback is triggered (special "coach" type from backend or a property)
      // Note: Backend seems to return 'persona' or 'coach' in 'type'
      if (response.type === 'coach') {
        setCoachFeedback(response);
        setShowCoachModal(true);
      } else {
        setMessages(prev => [...prev, response]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error?.response?.status === 429) {
        setChatError(error.response.data?.detail ?? 'Rate limit reached. Please wait a moment.');
      } else if (error?.response?.status === 410) {
        setChatError('Session expired. Please start a new roleplay.');
        setSessionOver(true);
      }
    } finally {
      setSending(false);
    }
  };

  const handleGetHint = async () => {
    if (!roleplay || gettingHint) return;
    if (sessionOver || achieved) return;
    if (hintCount >= MAX_HINTS) {
      setChatError(`You've used all ${MAX_HINTS} coach hints for this session.`);
      return;
    }
    setChatError(null);

    setGettingHint(true);
    try {
      const hint = await getRoleplayHint(roleplay.roleplay_id, turnCount);
      if (typeof hint.goal_progress === 'number') {
        setGoalProgress(hint.goal_progress);
        setProgressPulse(prev => prev + 1);
      }
      if (hint.goal_status) setGoalStatus(hint.goal_status);
      if (typeof hint.turns_remaining === 'number') setTurnsRemaining(hint.turns_remaining);
      if (typeof hint.achieved === 'boolean') setAchieved(hint.achieved);
      setCoachFeedback(hint);
      setShowCoachModal(true);
      setHintCount(prev => prev + 1);
    } catch (error: any) {
      console.error('Error getting hint:', error);
      if (error?.response?.status === 429) {
        setChatError(error.response.data?.detail ?? 'Rate limit reached. Please wait.');
      }
    } finally {
      setGettingHint(false);
    }
  };

  const handleResumeAfterCoach = () => {
    if (coachFeedback && coachFeedback.persona_resume) {
      setMessages(prev => [...prev, {
        type: 'coach',
        text: coachFeedback.encouragement || "Good effort! Let's continue.",
        timestamp: Date.now()
      } as RoleplayMessage]); // Adding coach message as a system note

      setMessages(prev => [...prev, {
        type: 'persona',
        text: coachFeedback.persona_resume!,
        timestamp: Date.now()
      } as RoleplayMessage]);
    }
    setShowCoachModal(false);
    setCoachFeedback(null);
  };

  const handleReplay = async () => {
    await initializeRoleplay();
  };

  const handleEndRoleplay = async () => {
    if (!roleplay) return;
    try {
      await endRoleplay(roleplay.roleplay_id);
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-slate-800">Setting the Scene...</h2>
            <p className="text-slate-500 mt-2">Preparing your conversation partner</p>
          </motion.div>
        </div>
      );
  }

  if (!roleplay) return null;

  // Briefing Modal
  if (showBriefing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative flex flex-col max-h-[85vh] transition-colors duration-300"
        >
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-8 text-white relative flex-shrink-0">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
             <h1 className="text-3xl font-bold mb-2">Mission Briefing</h1>
             <p className="text-orange-50 font-medium">Topic: {topic}</p>
          </div>
          
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-300 flex-shrink-0">
                 <UserIcon className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Your Role</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Engage in a conversation naturally. Don't worry about making mistakes—that's how you learn!</p>
               </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Your Mission</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{roleplay.user_goal}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                <CpuChipIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">The Scene</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{roleplay.scene_context}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 dark:text-purple-300 flex-shrink-0">
                 <CpuChipIcon className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">AI Partner</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{customDescription || `A generic ${personaType} character ready to chat.`}</p>
               </div>
            </div>

            <button 
              onClick={handleStartConversation}
              className="w-full btn-primary mt-4"
            >
              Start Conversation
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-2xl md:my-8 md:rounded-3xl overflow-hidden md:h-[calc(100vh-4rem)] border border-slate-200 dark:border-slate-700 transition-colors duration-300">
      
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50 p-4 flex items-center justify-between z-10 sticky top-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
            AI
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Conversation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{topic} • {difficulty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetHint}
            disabled={gettingHint || showCoachModal || sessionOver || achieved || hintCount >= MAX_HINTS}
            className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:border-slate-200 dark:disabled:border-slate-700 transition-colors flex items-center gap-1"
            title={hintCount >= MAX_HINTS ? 'No hints remaining' : `Get a coach hint (${MAX_HINTS - hintCount} left)`}
          >
            <SparklesIcon className={`w-4 h-4 ${gettingHint ? 'animate-spin' : ''}`} />
            Ask Coach ({MAX_HINTS - hintCount})
          </button>
          <button 
            onClick={handleEndRoleplay}
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-500/50 transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Game HUD */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 px-6 py-4 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Goal Progress - Clean & Large Percentage */}
          <div className="flex-1 w-full group relative cursor-help">
             <div className="absolute bottom-full left-0 mb-3 w-56 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all pointer-events-none z-20">
              <p className="font-semibold mb-1">Goal Progress</p>
              <p>This bar fills up as you complete objectives in your conversation. Aim for 100%! 🎯</p>
              <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
            </div>

            <div className="flex items-center gap-4">
               {/* Percentage Badge */}
               <div className={`
                 flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm border-2 transition-all duration-300
                 ${goalStatus === 'achieved' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 
                   goalStatus === 'off_track' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400' : 
                   'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-600 dark:text-orange-400'}
               `}>
                 <span className="text-xl font-bold">{Math.max(0, Math.min(100, goalProgress))}%</span>
               </div>

               {/* Bar & Label container */}
               <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Mission Progress</p>
                    {goalStatus === 'achieved' && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">COMPLETED</span>}
                  </div>
                  
                  <motion.div
                    key={progressPulse}
                    animate={goalStatus === 'off_track' ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700 group-hover:border-slate-200 dark:group-hover:border-slate-600 transition-colors"
                  >
                    <motion.div
                      initial={false}
                      animate={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }}
                      transition={{ duration: 0.8, type: "spring", bounce: 0.2 }} // Smoother spring animation
                      className={`h-full rounded-full shadow-sm relative overflow-hidden ${
                        goalStatus === 'achieved'
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : goalStatus === 'off_track'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-orange-400 to-orange-500'
                      }`}
                    >
                      {/* Sub-shine effect */}
                      <div className="absolute top-0 left-0 w-full h-full bg-white/20 transform -skew-x-12 translate-x-[-100%] animate-[shine_2s_infinite]"></div>
                    </motion.div>
                  </motion.div>
               </div>
            </div>
          </div>

          {/* Vertical Divider (Hidden on mobile) */}
          <div className="hidden sm:block w-px h-12 bg-slate-100 dark:bg-slate-700"></div>

          {/* Energy/Turns - Clean Visuals */}
          <div className="w-full sm:w-auto flex flex-col justify-center gap-1.5 group relative cursor-help">
             <div className="absolute bottom-full right-0 mb-3 w-56 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all pointer-events-none z-20">
              <p className="font-semibold mb-1">Energy remaining</p>
              <p>Each message you send costs 1 unit of energy. Make your words count! ⚡</p>
              <div className="absolute top-full right-12 -mt-1 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
               <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">Energy</span>
               <span className={`text-xs font-bold font-mono ${turnsRemaining < 2 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{turnsRemaining}/{maxTurns}</span>
            </div>
            
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-colors">
              {Array.from({ length: maxTurns }).map((_, idx) => {
                const active = idx < turnsRemaining;
                return (
                  <BoltIcon
                    key={idx}
                    className={`w-5 h-5 mx-0.5 transition-all duration-300 ${
                      active 
                        ? 'text-indigo-500 dark:text-indigo-400 fill-indigo-500 dark:fill-indigo-400 drop-shadow-sm scale-100' 
                        : 'text-slate-200 dark:text-slate-700 scale-90'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Context Card */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 px-4 py-3 transition-colors duration-300">
        <div className="grid gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Goal:</span> {roleplay.user_goal}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Background:</span> {roleplay.scene_context}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth transition-colors duration-300 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">
            Make the first move! Say "Hello" to start.
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isUser = msg.type === 'user';
            const isCoach = msg.type === 'coach';
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center my-4"
                >
                  <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs px-4 py-2 rounded-full shadow-sm">
                    {msg.text}
                  </div>
                </motion.div>
              );
            }

            if (isCoach) {
               return (
                 <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center my-4"
                 >
                    <div className="bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 text-xs px-4 py-2 rounded-full flex items-center gap-2 border border-blue-100 dark:border-blue-800 shadow-sm">
                      <SparklesIcon className="w-4 h-4" />
                      {msg.text}
                    </div>
                 </motion.div>
               )
            }

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95, x: isUser ? 20 : -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                   <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0 mt-1">
                     <CpuChipIcon className="w-5 h-5" />
                   </div>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed
                    ${isUser 
                      ? 'bg-orange-500 dark:bg-orange-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                    }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Typing indicator */}
        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
             <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-2 mt-1">
               <CpuChipIcon className="w-5 h-5" />
             </div>
             <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1">
               <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
               <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
        {/* Error / rate-limit banner */}
        {chatError && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs text-center">
            {chatError}
          </div>
        )}
        {/* Word count indicator */}
        {inputMessage.trim() && (
          <div className={`text-xs mb-1 text-right ${
            inputMessage.trim().split(/\s+/).length > MAX_MSG_WORDS
              ? 'text-red-500 dark:text-red-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          }`}>
            {inputMessage.trim().split(/\s+/).length}/{MAX_MSG_WORDS} words
          </div>
        )}
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
           <input 
             type="text"
             value={inputMessage}
             onChange={(e) => setInputMessage(e.target.value)}
             placeholder="Type your message..."
             disabled={sending || sessionOver || achieved || turnsRemaining <= 0}
             className="w-full pl-5 pr-12 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 focus:border-orange-400 dark:focus:border-orange-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
             autoFocus
           />
           <button 
             type="submit"
             disabled={!inputMessage.trim() || sending || sessionOver || achieved || turnsRemaining <= 0}
             className="absolute right-2 p-2 bg-orange-500 dark:bg-orange-600 rounded-full text-white shadow-md hover:bg-orange-600 dark:hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none transition-all active:scale-95"
           >
             <PaperAirplaneIcon className="w-5 h-5" />
           </button>
        </form>
      </div>

      {/* End-of-game Overlay */}
      <AnimatePresence>
        {(achieved || turnsRemaining <= 0 || sessionOver) && !showBriefing && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden transition-colors duration-300"
            >
              <div className={`p-6 text-white ${achieved ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-800 dark:bg-slate-700'}`}>
                <div className="flex items-center gap-2 font-bold">
                  <TrophyIcon className="w-6 h-6" />
                  {achieved ? 'Mission Complete' : 'Mission Ended'}
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {achieved
                    ? 'You reached the goal. Nice work!'
                    : 'You ran out of turns. Try again with a tighter plan.'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Final Progress</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{Math.max(0, Math.min(100, goalProgress))}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-2 ${achieved ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleReplay}
                    className="btn-primary bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleEndRoleplay}
                    className="btn-primary bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Coach Modal */}
      <AnimatePresence>
        {showCoachModal && coachFeedback && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl transition-colors duration-300 max-h-[85vh] flex flex-col"
             >
               <div className="bg-blue-500 dark:bg-blue-600 p-4 flex items-center justify-between text-white shrink-0">
                 <div className="flex items-center gap-2 font-bold">
                   <SparklesIcon className="w-5 h-5" />
                   AI Coach Breakdown
                 </div>
                 <button onClick={handleResumeAfterCoach} className="hover:bg-white/20 p-1 rounded-full"><XMarkIcon className="w-5 h-5" /></button>
               </div>
               
               <div className="p-6 space-y-4 overflow-y-auto flex-1">
                 {typeof coachFeedback.politeness_score === 'number' && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Politeness</p>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-slate-700 dark:text-slate-300 font-medium">Score</span>
                       <span className="text-slate-700 dark:text-slate-300 font-bold">{coachFeedback.politeness_score}%</span>
                     </div>
                     <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div
                         className="h-2 bg-blue-500 dark:bg-blue-400"
                         style={{ width: `${coachFeedback.politeness_score}%` }}
                       />
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.grammar_notes?.length && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Grammar Notes</p>
                     <div className="space-y-2">
                       {coachFeedback.grammar_notes.map((note, idx) => (
                         <div key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl p-3">
                           {note}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.vocab_suggestions?.length && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Vocabulary Tips</p>
                     <div className="space-y-2">
                       {coachFeedback.vocab_suggestions.map((tip, idx) => (
                         <div key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl p-3">
                           {tip}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.encouragement && (
                   <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                     <p className="text-xs font-bold uppercase text-green-600 dark:text-green-400 tracking-wider mb-1">Encouragement</p>
                     <p className="text-green-800 dark:text-green-200 font-medium">{coachFeedback.encouragement}</p>
                   </div>
                 )}
                 
                 <button onClick={handleResumeAfterCoach} className="w-full btn-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-200 dark:shadow-none">
                   Got it, continue!
                 </button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}