import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Exercise } from '../types';
import { generatePractice, scoreAnswers } from '../api';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

type ReorderBoard = {
  available: string[];
  selected: string[];
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Practice() {
  const location = useLocation();
  const navigate = useNavigate();

  // Accept either the new config-only state OR the legacy exercises-in-state format
  const state = location.state as
    | {
        exercises?: Exercise[];
        topic: string;
        difficulty: string;
        focusAreas?: string[];
      }
    | undefined;

  const topic = state?.topic ?? '';
  const difficulty = state?.difficulty ?? 'beginner';
  const focusAreas = useMemo(() => state?.focusAreas ?? [], [state?.focusAreas]);

  const [exercises, setExercises] = useState<Exercise[]>(state?.exercises ?? []);
  const [answers, setAnswers] = useState<string[]>([]);
  const [reorderBoards, setReorderBoards] = useState<Record<number, ReorderBoard>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Redirect if no config at all
  useEffect(() => {
    if (!state || !state.topic) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  // Fetch exercises on mount if not provided in state (new flow)
  useEffect(() => {
    if (hasFetched.current) return;
    if (!state || !state.topic) return;
    // If exercises were passed directly (e.g. from Feedback "Practice Weak Areas"), skip fetch
    if (state.exercises && state.exercises.length > 0) return;

    hasFetched.current = true;
    setGenerating(true);
    setError(null);

    generatePractice(topic, difficulty, focusAreas)
      .then((result) => {
        setExercises(result.exercises);
        setAnswers(new Array(result.exercises.length).fill(''));
      })
      .catch((err) => {
        console.error('Error generating exercises:', err);
        setError('Failed to generate exercises. Make sure the backend is running!');
      })
      .finally(() => setGenerating(false));
  }, [state, topic, difficulty, focusAreas]);

  // Sync answers array when exercises change (e.g. passed via state)
  useEffect(() => {
    if (exercises.length > 0 && answers.length !== exercises.length) {
      setAnswers(new Array(exercises.length).fill(''));
    }
  }, [exercises.length, answers.length]);

  // Initialize sentence reordering boards when exercises arrive
  useEffect(() => {
    if (!exercises.length) return;

    setReorderBoards((prev) => {
      const next = { ...prev };
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        if (exercise.type !== 'sentence_reordering') continue;
        if (next[i]) continue;

        const providedTokens = Array.isArray(exercise.tokens) ? exercise.tokens.filter(Boolean) : [];
        const fallbackTokens = exercise.correct_answer
          ? exercise.correct_answer
              .replace(/[.!?]+$/g, '')
              .split(/\s+/)
              .filter(Boolean)
          : [];

        const available = providedTokens.length ? providedTokens : shuffleArray(fallbackTokens);
        next[i] = { available, selected: [] };
      }
      return next;
    });
  }, [exercises]);

  // Early returns
  if (!state || !state.topic) return null;

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5] 
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-orange-100 rounded-full mx-auto flex items-center justify-center"
          >
            <SparklesIcon className="w-12 h-12 text-orange-500" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Analyzing Topic...</h2>
            <p className="text-slate-500 dark:text-slate-400">Generating tailored questions for <span className="font-semibold text-orange-600 dark:text-orange-400">{topic}</span></p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-l-4 border-red-500"
        >
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">Back to Home</button>
        </motion.div>
      </div>
    );
  }

  if (exercises.length === 0) return null;

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleReorderPick = (exerciseIndex: number, tokenIndex: number) => {
    setReorderBoards((prev) => {
      const board = prev[exerciseIndex];
      if (!board) return prev;
      const token = board.available[tokenIndex];
      if (!token) return prev;

      const available = board.available.filter((_, idx) => idx !== tokenIndex);
      const selected = [...board.selected, token];

      handleAnswerChange(exerciseIndex, selected.join(' '));

      return { ...prev, [exerciseIndex]: { available, selected } };
    });
  };

  const handleReorderUnpick = (exerciseIndex: number, tokenIndex: number) => {
    setReorderBoards((prev) => {
      const board = prev[exerciseIndex];
      if (!board) return prev;
      const token = board.selected[tokenIndex];
      if (!token) return prev;

      const selected = board.selected.filter((_, idx) => idx !== tokenIndex);
      const available = [...board.available, token];

      handleAnswerChange(exerciseIndex, selected.join(' '));

      return { ...prev, [exerciseIndex]: { available, selected } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check all answers are filled (and reordering uses all tokens)
    const incompleteIndex = exercises.findIndex((exercise, idx) => {
      const a = answers[idx] ?? '';
      if (exercise.type === 'sentence_reordering') {
        const board = reorderBoards[idx];
        if (!board) return true;
        const totalTokens = board.available.length + board.selected.length;
        return totalTokens === 0 || board.selected.length !== totalTokens;
      }
      return !a.trim();
    });

    if (incompleteIndex !== -1) {
      alert(`Please complete question ${incompleteIndex + 1}`);
      return;
    }

    setLoading(true);
    
    try {
      const result = await scoreAnswers(exercises, answers);
      
      // Navigate to feedback page
      navigate('/feedback', { 
        state: { 
          result,
          topic,
          difficulty,
          exercises,
          answers
        } 
      });
    } catch (error) {
      console.error('Error scoring answers:', error);
      alert('Failed to score answers. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <button
          onClick={() => navigate('/')}
          className="group flex items-center text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${difficulty === 'beginner' ? 'bg-green-100 text-green-700' : 
                  difficulty === 'intermediate' ? 'bg-blue-100 text-blue-700' : 
                  'bg-purple-100 text-purple-700'}`}>
                {difficulty}
              </span>
              <span className="flex items-center text-xs text-slate-400 font-medium">
                <ClockIcon className="w-4 h-4 mr-1" /> Est. 5 mins
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Practice: <span className="text-orange-600">{topic}</span>
            </h1>
          </div>
          <div className="text-right">
             <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">Progress</div>
             <div className="flex items-center gap-1">
               <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{answers.filter(a => a.trim()).length}</span>
               <span className="text-slate-400">/</span>
               <span className="text-xl text-slate-400">{exercises.length}</span>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Exercises */}
      <form onSubmit={handleSubmit}>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {exercises.map((exercise, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-lg ring-1 ring-slate-100 dark:ring-white/5 relative overflow-hidden group hover:ring-orange-200 dark:hover:ring-orange-500/30 transition-all"
            >
              {/* Decorative Number */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="text-9xl font-black text-slate-900 dark:text-slate-100 leading-none -mr-4 -mt-4 block">{index + 1}</span>
              </div>

              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 leading-relaxed pr-8">
                  <span className="text-orange-500 mr-2">{index + 1}.</span>
                  {exercise.question}
                </h3>
                
                {/* Multiple choice + banked cloze (selection) */}
                {(exercise.type === 'multiple_choice' || exercise.type === 'banked_cloze') && exercise.options ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {exercise.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className={`cursor-pointer relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-200
                          ${answers[index] === option
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 shadow-md'
                            : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 hover:border-orange-200 dark:hover:border-orange-500/40 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={answers[index] === option}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{option}</span>
                          {answers[index] === option && (
                            <CheckCircleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : exercise.type === 'sentence_reordering' ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Your sentence (tap to remove)</div>
                      <div className="flex flex-wrap gap-2 min-h-[44px]">
                        {(reorderBoards[index]?.selected ?? []).length === 0 ? (
                          <span className="text-sm text-slate-400 dark:text-slate-500">Tap words below to build the sentence.</span>
                        ) : (
                          (reorderBoards[index]?.selected ?? []).map((token, tokenIndex) => (
                            <button
                              key={`${token}-${tokenIndex}`}
                              type="button"
                              onClick={() => handleReorderUnpick(index, tokenIndex)}
                              className="px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-orange-200 dark:hover:border-orange-500/40 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                            >
                              {token}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Word bank (tap to add)</div>
                      <div className="flex flex-wrap gap-2">
                        {(reorderBoards[index]?.available ?? []).map((token, tokenIndex) => (
                          <button
                            key={`${token}-${tokenIndex}`}
                            type="button"
                            onClick={() => handleReorderPick(index, tokenIndex)}
                            className="px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-orange-200 dark:hover:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    Unsupported exercise type: <span className="font-semibold">{exercise.type}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Submit Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="sticky bottom-6 mt-12 z-20"
        >
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl -m-6 rounded-t-3xl border-t border-white/50 dark:border-slate-800/60 -z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]"></div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-12 py-4 text-lg shadow-2xl hover:shadow-orange-500/40 w-full md:w-auto"
            >
              {loading ? (
                <span className="flex items-center">
                  <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Analyzing Answers...
                </span>
              ) : (
                <span className="flex items-center">
                  Submit for Grading
                  <CheckCircleIcon className="ml-2 w-6 h-6" />
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </form>

      {/* Helper function for the button icon */}
      <div className="h-20"></div> {/* Spacer for sticky button */}
    </div>
  );
}

// Icon helper
function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
