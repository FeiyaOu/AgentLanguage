import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ScoreResult, Exercise } from '../types';
import { askTutor } from '../api';

// --- Constants ---
const MAX_TURNS_PER_QUESTION = 3;
const MAX_TURNS_PER_SESSION = 15;
const MAX_WORDS_PER_MESSAGE = 50;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, topic, difficulty } = location.state as { 
    result: ScoreResult; 
    topic: string;
    difficulty: string;
    exercises: Exercise[];
    answers: string[];
  };

  // --- Tutor chat state ---
  const [tutorOpen, setTutorOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // Per-question conversation histories: { [questionNum]: ChatMessage[] }
  const [histories, setHistories] = useState<Record<number, ChatMessage[]>>({});
  // Per-question turn counters
  const [turnCounts, setTurnCounts] = useState<Record<number, number>>({});
  // Session-wide turn counter
  const [sessionTurns, setSessionTurns] = useState(0);
  // Error / info banner inside the modal
  const [tutorError, setTutorError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const turnsForActive = activeQuestion !== null ? (turnCounts[activeQuestion] ?? 0) : 0;
  const questionCapReached = turnsForActive >= MAX_TURNS_PER_QUESTION;
  const sessionCapReached = sessionTurns >= MAX_TURNS_PER_SESSION;
  const sendDisabled = loading || questionCapReached || sessionCapReached;

  // Build context object for the active question
  const getActiveContext = (): Record<string, string | number | boolean | null> | undefined => {
    if (activeQuestion === null) return undefined;
    const score = result.detailed_scores.find(s => s.question_num === activeQuestion);
    if (!score) return undefined;
    return {
      question: score.question ?? '',
      user_answer: score.user_answer ?? '',
      correct_answer: score.correct_answer ?? '',
      feedback: score.feedback,
    };
  };

  const openTutorForQuestion = (questionNum: number) => {
    setActiveQuestion(questionNum);
    setTutorOpen(true);
    setTutorError(null);
    // Scroll to bottom after render
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async (userText: string) => {
    if (!userText.trim() || activeQuestion === null) return;

    // Guard: caps
    if (questionCapReached || sessionCapReached) return;

    // Guard: word limit
    const wordCount = userText.trim().split(/\s+/).length;
    if (wordCount > MAX_WORDS_PER_MESSAGE) {
      setTutorError(`Please keep your question under ${MAX_WORDS_PER_MESSAGE} words (currently ${wordCount}).`);
      return;
    }

    setLoading(true);
    setTutorError(null);

    // Append user message to history immediately (optimistic)
    const prevHistory = histories[activeQuestion] ?? [];
    const updatedHistory = [...prevHistory, { role: 'user' as const, content: userText }];
    setHistories(prev => ({ ...prev, [activeQuestion]: updatedHistory }));

    try {
      const response = await askTutor(userText, getActiveContext(), prevHistory);

      const withResponse = [...updatedHistory, { role: 'assistant' as const, content: response.answer }];
      setHistories(prev => ({ ...prev, [activeQuestion]: withResponse }));

      // Increment counters
      setTurnCounts(prev => ({ ...prev, [activeQuestion]: (prev[activeQuestion] ?? 0) + 1 }));
      setSessionTurns(prev => prev + 1);
    } catch (err: unknown) {
      // Handle 429 rate limit
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr?.response?.status === 429) {
        setTutorError(axiosErr.response.data?.detail ?? 'Rate limit exceeded. Please wait a moment.');
        // Remove optimistic user message
        setHistories(prev => ({ ...prev, [activeQuestion]: prevHistory }));
      } else {
        const errMsg = { role: 'assistant' as const, content: 'Sorry, something went wrong. Please try again.' };
        setHistories(prev => ({ ...prev, [activeQuestion]: [...updatedHistory, errMsg] }));
      }
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleContinue = () => {
    const focusAreas = [...result.weak_areas];
    if (result.suggested_exercise_type) {
      focusAreas.push(`preferred style: ${result.suggested_exercise_type}`);
    }
    navigate('/practice', { state: { topic, difficulty, focusAreas } });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20';
    if (percentage >= 60) return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20';
    return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20';
  };

  const getScoreEmoji = (percentage: number) => {
    if (percentage >= 80) return '🎉';
    if (percentage >= 60) return '👍';
    return '💪';
  };

  return (
    <div className="min-h-screen px-4 py-12 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreEmoji(result.score_percentage)}</div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Great Work!
          </h1>
          <p className="text-slate-600 dark:text-slate-300">Here's how you did</p>
        </div>

        {/* Score Card */}
        <div className="card mb-6">
          <div className="text-center">
            <div className={`inline-block px-8 py-4 rounded-2xl ${getScoreColor(result.score_percentage)}`}>
              <div className="text-5xl font-bold mb-2">
                {result.score_percentage}%
              </div>
              <div className="text-lg font-semibold">
                {result.total_score}
              </div>
            </div>
             {result.suggested_exercise_type && (
                 <div className="mt-4 text-slate-600 dark:text-slate-300">
                    Recommended Practice: <span className="font-semibold text-primary-600 dark:text-primary-400 capitalize">{result.suggested_exercise_type}</span>
               </div>
            )}
          </div>
        </div>

        {/* Detailed Scores */}
        {result.detailed_scores && result.detailed_scores.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Question by Question</h2>
            <div className="space-y-4">
              {result.detailed_scores.map((score, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    score.correct
                      ? 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/15'
                      : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/15'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-1 ${
                        score.correct ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                        {score.correct ? (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                        </span>
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">Question {score.question_num}</span>
                            </div>
                            
                            {/* Question Text */}
                            <p className="text-slate-900 dark:text-slate-100 font-medium mb-2">{score.question || "Question text unavailable"}</p>
                            
                            {/* Answers */}
                            <div className="grid gap-2 mb-3">
                              <div className={`px-3 py-2 rounded ${score.correct ? 'bg-green-100 text-green-900 dark:bg-green-900/25 dark:text-green-100' : 'bg-red-100 text-red-900 dark:bg-red-900/25 dark:text-red-100'}`}>
                                <span className="font-semibold text-xs uppercase tracking-wider block opacity-75">Your Answer</span>
                                    {score.user_answer || "No answer"}
                                </div>
                                {!score.correct && (
                                <div className="px-3 py-2 rounded bg-green-100 text-green-900 dark:bg-green-900/25 dark:text-green-100">
                                        <span className="font-semibold text-xs uppercase tracking-wider block opacity-75">Correct Answer</span>
                                        {score.correct_answer || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* Logic/Feedback */}
                            <div className="text-sm text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-900/40 p-3 rounded">
                                <span className="font-semibold block mb-1">Feedback:</span>
                                {score.feedback}
                            </div>
                        </div>
                    </div>
                    
                    {/* Ask Tutor Button */}
                    <button
                        onClick={() => openTutorForQuestion(score.question_num)}
                      className="ml-4 flex-shrink-0 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-slate-800/60 p-2 rounded-full transition-colors"
                        title="Ask AI Tutor about this"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {result.weak_areas && result.weak_areas.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              <span className="mr-2">🎯</span>
              Areas to Focus On
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {result.weak_areas.map((area, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 rounded-full font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40">
              <p className="text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-blue-800 dark:text-blue-300">Tip: </span>
                {result.recommendations}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            New Topic
          </button>
          <button
            onClick={handleContinue}
            className="btn-primary"
          >
            <span className="flex items-center">
              <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Practice Weak Areas
            </span>
          </button>
        </div>
      </div>

      {/* Tutor Chat Panel */}
      {tutorOpen && activeQuestion !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-primary-50 dark:bg-slate-700 rounded-t-xl">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center">
                  <span className="text-2xl mr-2">👨‍🏫</span>
                  AI Tutor
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400">
                    (Question {activeQuestion})
                  </span>
                </h3>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex gap-3">
                  <span>This Q: {turnsForActive}/{MAX_TURNS_PER_QUESTION} turns</span>
                  <span>Session: {sessionTurns}/{MAX_TURNS_PER_SESSION}</span>
                </div>
              </div>
              <button
                onClick={() => setTutorOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat messages */}
            <div className="p-4 overflow-y-auto flex-grow space-y-3">
              {/* Intro hint (only when no messages yet) */}
              {!(histories[activeQuestion]?.length) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                  Ask me anything about this question! For example: "Why is my answer wrong?" or "Can you explain the grammar rule?"
                </div>
              )}

              {/* Conversation bubbles */}
              {(histories[activeQuestion] ?? []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`p-3 rounded-lg max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-100 rounded-tr-none'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg rounded-tl-none flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Rate limit / cap banners */}
            {tutorError && (
              <div className="mx-4 mb-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs text-center">
                {tutorError}
              </div>
            )}
            {questionCapReached && (
              <div className="mx-4 mb-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-xs text-center">
                You've used all {MAX_TURNS_PER_QUESTION} follow-ups for this question. Try asking about a different question!
              </div>
            )}
            {!questionCapReached && sessionCapReached && (
              <div className="mx-4 mb-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-xs text-center">
                You've reached the session limit of {MAX_TURNS_PER_SESSION} tutor questions. Start a new practice set to reset.
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-b-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('question') as HTMLInputElement;
                  handleSend(input.value);
                  input.value = '';
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  name="question"
                  placeholder={sendDisabled ? 'Limit reached' : 'Ask a follow-up…'}
                  disabled={sendDisabled}
                  className="flex-1 rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={sendDisabled}
                  className="btn-primary py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
