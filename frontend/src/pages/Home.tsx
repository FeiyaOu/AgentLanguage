import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suggestPersonas } from '../api';
import type { SuggestedPersona } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AcademicCapIcon, 
  ChatBubbleBottomCenterTextIcon, 
  SparklesIcon, 
  ArrowRightIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const DIFFICULTY_INFO: Record<string, { label: string; desc: string }> = {
  beginner: { label: 'Beginner', desc: 'Simple vocabulary, short sentences' },
  intermediate: { label: 'Intermediate', desc: 'Complex grammar, natural phrasing' },
  advanced: { label: 'Advanced', desc: 'Idioms, nuance, fast-paced' },
};

export default function Home() {
  const navigate = useNavigate();

  /* ── Exercise card state ── */
  const [exTopic, setExTopic] = useState('');
  const [exDiff, setExDiff] = useState('beginner');

  /* ── Roleplay card state ── */
  const [rpTopic, setRpTopic] = useState('');
  const [rpDiff, setRpDiff] = useState('beginner');
  const [suggestedPersonas, setSuggestedPersonas] = useState<SuggestedPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<SuggestedPersona | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);

  /* ── Handlers ── */
  const handleExerciseStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTopic.trim()) { alert('Please enter a topic'); return; }
    navigate('/practice', { state: { topic: exTopic, difficulty: exDiff } });
  };

  const handleFindPartners = async () => {
    if (!rpTopic.trim()) { alert('Please enter a scenario first'); return; }
    setLoadingPersonas(true);
    setPersonaError(null);
    setSuggestedPersonas([]);
    setSelectedPersona(null);
    setUseCustom(false);
    try {
      const personas = await suggestPersonas(rpTopic, rpDiff);
      setSuggestedPersonas(personas);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setPersonaError('Slow down! You\'ve searched too many times. Please wait a moment and try again.');
      } else {
        setPersonaError('Failed to suggest partners. Make sure the backend is running!');
      }
    } finally {
      setLoadingPersonas(false);
    }
  };

  const handleRoleplayStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpTopic.trim()) { alert('Please enter a scenario'); return; }
    if (!selectedPersona && !useCustom) { alert('Please pick a conversation partner'); return; }
    navigate('/roleplay', {
      state: {
        topic: rpTopic,
        difficulty: rpDiff,
        personaType: useCustom ? 'custom' : 'custom',
        customDescription: useCustom
          ? customDescription
          : `${selectedPersona!.name} — ${selectedPersona!.traits}`,
      },
    });
  };

  /* ── Shared difficulty selector ── */
  const DifficultySelector = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Proficiency Level</label>
      <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors duration-200">
        {Object.entries(DIFFICULTY_INFO).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              value === key
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 pl-1">
        {DIFFICULTY_INFO[value].desc}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-12 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* ── Hero ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6 border border-slate-100 dark:border-slate-700 transition-colors">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">AI-Powered Learning</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            Fluent in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Minutes</span>.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Master any language scenario with an intelligent AI tutor that adapts to your learning style in real-time.
          </p>
        </motion.div>

        {/* ── Two-pathway grid ── */}
        <div className="grid lg:grid-cols-2 gap-8 items-start mb-24">

          {/* ════════ EXERCISE CARD ════════ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form
              onSubmit={handleExerciseStart}
              className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col h-full transition-colors duration-300"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                  <AcademicCapIcon className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Drills & Practice</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Target specific vocabulary and grammar with AI-generated quizzes.</p>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label htmlFor="ex-topic" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Topic</label>
                  <input
                    id="ex-topic"
                    type="text"
                    value={exTopic}
                    onChange={(e) => setExTopic(e.target.value)}
                    placeholder="e.g., Business Phrasal Verbs..."
                    className="input-field"
                  />
                </div>
                <DifficultySelector value={exDiff} onChange={setExDiff} />
              </div>

              <div className="pt-8 mt-auto">
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Start Practice
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>

          {/* ════════ ROLEPLAY CARD ════════ */}
          <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-red-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form
              onSubmit={handleRoleplayStart}
              className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col h-full transition-colors duration-300"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                  <ChatBubbleBottomCenterTextIcon className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roleplay Simulation</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Immersive conversations with unique AI personalities.</p>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label htmlFor="rp-topic" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Scenario</label>
                  <input
                    id="rp-topic"
                    type="text"
                    value={rpTopic}
                    onChange={(e) => {
                      setRpTopic(e.target.value);
                      if (suggestedPersonas.length > 0) {
                        setSuggestedPersonas([]);
                        setSelectedPersona(null);
                        setUseCustom(false);
                      }
                    }}
                    placeholder="e.g., Checking into a hotel..."
                    className="input-field"
                  />
                </div>

                <DifficultySelector value={rpDiff} onChange={setRpDiff} />

                {/* Persona Selection Area */}
                <AnimatePresence>
                  {suggestedPersonas.length === 0 && !loadingPersonas && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <button
                        type="button"
                        onClick={handleFindPartners}
                        disabled={!rpTopic.trim()}
                        className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 border-dashed ${
                          rpTopic.trim()
                            ? 'border-orange-200 dark:border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:border-orange-300 dark:hover:border-orange-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <UserGroupIcon className="w-5 h-5" />
                        Find Conversation Partners
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {personaError && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3">
                    {personaError}
                  </div>
                )}

                {loadingPersonas && (
                  <div className="flex flex-col items-center justify-center py-8 text-orange-600 dark:text-orange-400">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-sm font-medium">Summoning actors...</span>
                  </div>
                )}

                {suggestedPersonas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-end">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Choose Partner</label>
                      <button type="button" onClick={handleFindPartners} className="text-xs text-orange-500 dark:text-orange-400 font-medium hover:text-orange-600">Refresh</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {suggestedPersonas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPersona(p); setUseCustom(false); }}
                          className={`p-3 rounded-xl text-left transition-all duration-200 border relative overflow-hidden group/persona ${
                            selectedPersona?.id === p.id
                              ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/30 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-2xl mb-2">{p.emoji}</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.traits}</div>
                          {selectedPersona?.id === p.id && (
                            <div className="absolute top-2 right-2 text-orange-500">
                              <SparklesIcon className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => { setUseCustom(true); setSelectedPersona(null); }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                        useCustom 
                         ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-300' 
                         : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      Or describe a custom partner...
                    </button>
                    
                    {useCustom && (
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="E.g., An angry chef who hates processed food..."
                        className="input-field text-sm min-h-[80px]"
                        autoFocus
                      />
                    )}
                  </motion.div>
                )}
              </div>

              <div className="pt-8 mt-auto">
                <button
                  type="submit"
                  disabled={(suggestedPersonas.length === 0 && !useCustom) && !loadingPersonas}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Start Roleplay
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* ── Features Strip ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: AcademicCapIcon, title: "Smart Curriculum", desc: "Questions adapt to your proficiency level automatically." },
            { icon: ChatBubbleBottomCenterTextIcon, title: "Natural Dialogue", desc: "Speak freely—the AI understands context and nuance." },
            { icon: SparklesIcon, title: "Instant Feedback", desc: "Get corrections on grammar and style in real-time." }
          ].map((feature, i) => (
            <div key={i} className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-white/40 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <feature.icon className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
  }
