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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleGetHint = async () => {
    if (!roleplay || gettingHint) return;
    if (sessionOver || achieved) return;

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
    } catch (error) {
      console.error('Error getting hint:', error);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative"
        >
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
             <h1 className="text-3xl font-bold mb-2">Mission Briefing</h1>
             <p className="text-orange-50 font-medium">Topic: {topic}</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                 <UserIcon className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">Your Role</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Engage in a conversation naturally. Don't worry about making mistakes—that's how you learn!</p>
               </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Your Mission</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{roleplay.user_goal}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                <CpuChipIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">The Scene</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{roleplay.scene_context}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                 <CpuChipIcon className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">AI Partner</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{customDescription || `A generic ${personaType} character ready to chat.`}</p>
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-2xl md:my-8 md:rounded-3xl overflow-hidden md:h-[calc(100vh-4rem)] border border-slate-200">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
            AI
          </div>
          <div>
            <h2 className="font-bold text-slate-800 leading-tight">Conversation</h2>
            <p className="text-xs text-slate-500">{topic} • {difficulty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetHint}
            disabled={gettingHint || showCoachModal || sessionOver || achieved}
            className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700 disabled:text-slate-300 disabled:border-slate-200 transition-colors flex items-center gap-1"
            title="Get a coach hint (doesn't consume a turn)"
          >
            <SparklesIcon className={`w-4 h-4 ${gettingHint ? 'animate-spin' : ''}`} />
            Ask Coach
          </button>
          <button 
            onClick={handleEndRoleplay}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 px-3 py-1 rounded-full border border-slate-200 hover:border-red-200 transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Game HUD */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Goal Progress</p>
              <p className="text-[11px] font-semibold text-slate-500">{Math.max(0, Math.min(100, goalProgress))}%</p>
            </div>
            <motion.div
              key={progressPulse}
              animate={goalStatus === 'off_track' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="h-2.5 bg-slate-100 rounded-full overflow-hidden"
            >
              <motion.div
                initial={false}
                animate={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  goalStatus === 'achieved'
                    ? 'bg-emerald-500'
                    : goalStatus === 'off_track'
                    ? 'bg-amber-500'
                    : 'bg-orange-500'
                }`}
              />
            </motion.div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Energy</div>
            <div className="flex items-center">
              {Array.from({ length: maxTurns }).map((_, idx) => {
                const active = idx < turnsRemaining;
                return (
                  <BoltIcon
                    key={idx}
                    className={`w-4 h-4 ${active ? 'text-indigo-500' : 'text-slate-200'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Context Card */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="grid gap-2">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Goal:</span> {roleplay.user_goal}
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Background:</span> {roleplay.scene_context}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-sm">
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
                  <div className="bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-sm">
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
                    <div className="bg-blue-50 text-blue-800 text-xs px-4 py-2 rounded-full flex items-center gap-2 border border-blue-100 shadow-sm">
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
                   <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-2 flex-shrink-0 mt-1">
                     <CpuChipIcon className="w-5 h-5" />
                   </div>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed
                    ${isUser 
                      ? 'bg-orange-500 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
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
             <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-2 mt-1">
               <CpuChipIcon className="w-5 h-5" />
             </div>
             <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
               <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
           <input 
             type="text"
             value={inputMessage}
             onChange={(e) => setInputMessage(e.target.value)}
             placeholder="Type your message..."
             disabled={sending || sessionOver || achieved || turnsRemaining <= 0}
             className="w-full pl-5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all"
             autoFocus
           />
           <button 
             type="submit"
             disabled={!inputMessage.trim() || sending || sessionOver || achieved || turnsRemaining <= 0}
             className="absolute right-2 p-2 bg-orange-500 rounded-full text-white shadow-md hover:bg-orange-600 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
           >
             <PaperAirplaneIcon className="w-5 h-5" />
           </button>
        </form>
      </div>

      {/* End-of-game Overlay */}
      <AnimatePresence>
        {(achieved || turnsRemaining <= 0 || sessionOver) && !showBriefing && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className={`p-6 text-white ${achieved ? 'bg-emerald-500' : 'bg-slate-800'}`}>
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
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Final Progress</span>
                    <span className="font-bold text-slate-800">{Math.max(0, Math.min(100, goalProgress))}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-2 ${achieved ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleReplay}
                    className="btn-primary bg-slate-800 hover:bg-slate-700"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleEndRoleplay}
                    className="btn-primary bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
             >
               <div className="bg-blue-500 p-4 flex items-center justify-between text-white">
                 <div className="flex items-center gap-2 font-bold">
                   <SparklesIcon className="w-5 h-5" />
                   AI Coach Breakdown
                 </div>
                 <button onClick={handleResumeAfterCoach} className="hover:bg-white/20 p-1 rounded-full"><XMarkIcon className="w-5 h-5" /></button>
               </div>
               
               <div className="p-6 space-y-4">
                 {typeof coachFeedback.politeness_score === 'number' && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Politeness</p>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-slate-700 font-medium">Score</span>
                       <span className="text-slate-700 font-bold">{coachFeedback.politeness_score}%</span>
                     </div>
                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div
                         className="h-2 bg-blue-500"
                         style={{ width: `${coachFeedback.politeness_score}%` }}
                       />
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.grammar_notes?.length && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Grammar Notes</p>
                     <div className="space-y-2">
                       {coachFeedback.grammar_notes.map((note, idx) => (
                         <div key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                           {note}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.vocab_suggestions?.length && (
                   <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Vocabulary Tips</p>
                     <div className="space-y-2">
                       {coachFeedback.vocab_suggestions.map((tip, idx) => (
                         <div key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                           {tip}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {!!coachFeedback.encouragement && (
                   <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                     <p className="text-xs font-bold uppercase text-green-600 tracking-wider mb-1">Encouragement</p>
                     <p className="text-green-800 font-medium">{coachFeedback.encouragement}</p>
                   </div>
                 )}
                 
                 <button onClick={handleResumeAfterCoach} className="w-full btn-primary bg-blue-600 hover:bg-blue-700 shadow-blue-200">
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