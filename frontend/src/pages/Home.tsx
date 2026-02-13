import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suggestPersonas } from '../api';
import type { SuggestedPersona } from '../types';

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
    } catch {
      setPersonaError('Failed to suggest partners. Make sure the backend is running!');
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
      <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
      <div className="space-y-2">
        {Object.entries(DIFFICULTY_INFO).map(([key, { label, desc }]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 ${
              value === key
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className={`block text-xs mt-0.5 ${value === key ? 'text-white/80' : 'text-gray-500'}`}>
              {desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-primary-100 rounded-2xl mb-4">
            <svg className="w-14 h-14 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-3">
            Language Learning <span className="text-primary-500">Agent</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Practice English with an AI that adapts to you — choose your path below
          </p>
        </div>

        {/* ── Two-pathway grid ── */}
        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* ════════ EXERCISE CARD ════════ */}
          <form
            onSubmit={handleExerciseStart}
            className="bg-white rounded-2xl shadow-lg border-2 border-emerald-100 overflow-hidden flex flex-col"
          >
            {/* Card header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📝</span>
                <h2 className="text-xl font-bold">Exercise Mode</h2>
              </div>
              <p className="text-emerald-100 text-sm">
                Answer AI-generated questions and get scored instantly
              </p>
            </div>

            {/* What to expect */}
            <div className="px-6 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">What to expect</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 5 targeted questions per session</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Multiple choice or fill-in-the-blank</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Instant scoring with per-question feedback</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Weak area report &amp; AI tutor follow-up</li>
              </ul>
            </div>

            {/* Form fields */}
            <div className="px-6 space-y-4 flex-1">
              <div>
                <label htmlFor="ex-topic" className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
                <input
                  id="ex-topic"
                  type="text"
                  value={exTopic}
                  onChange={(e) => setExTopic(e.target.value)}
                  placeholder="e.g., restaurant English, travel phrases, business meetings..."
                  className="input-field"
                />
              </div>
              <DifficultySelector value={exDiff} onChange={setExDiff} />
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 pt-5">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                Start Exercises
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </form>

          {/* ════════ ROLEPLAY CARD ════════ */}
          <form
            onSubmit={handleRoleplayStart}
            className="bg-white rounded-2xl shadow-lg border-2 border-primary-100 overflow-hidden flex flex-col"
          >
            {/* Card header */}
            <div className="bg-gradient-to-r from-primary-500 to-amber-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🎭</span>
                <h2 className="text-xl font-bold">Roleplay Mode</h2>
              </div>
              <p className="text-orange-100 text-sm">
                Have a live conversation with an AI character &amp; get coached
              </p>
            </div>

            {/* What to expect */}
            <div className="px-6 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">What to expect</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">✓</span> Chat with a unique AI persona</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">✓</span> Coach feedback on grammar &amp; politeness every 3 turns</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">✓</span> Vocabulary tips &amp; better phrasing suggestions</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">✓</span> Adaptive dialogue that responds to your style</li>
              </ul>
            </div>

            {/* Form fields */}
            <div className="px-6 space-y-4 flex-1">
              <div>
                <label htmlFor="rp-topic" className="block text-sm font-semibold text-gray-700 mb-1">Scenario</label>
                <input
                  id="rp-topic"
                  type="text"
                  value={rpTopic}
                  onChange={(e) => {
                    setRpTopic(e.target.value);
                    // Reset personas when scenario changes
                    if (suggestedPersonas.length > 0) {
                      setSuggestedPersonas([]);
                      setSelectedPersona(null);
                      setUseCustom(false);
                      setPersonaError(null);
                    }
                  }}
                  placeholder="e.g., ordering at a restaurant, checking into a hotel..."
                  className="input-field"
                />
              </div>

              <DifficultySelector value={rpDiff} onChange={(v) => {
                setRpDiff(v);
                if (suggestedPersonas.length > 0) {
                  setSuggestedPersonas([]);
                  setSelectedPersona(null);
                  setUseCustom(false);
                }
              }} />

              {/* Step 2: Find partners button */}
              {suggestedPersonas.length === 0 && !loadingPersonas && (
                <button
                  type="button"
                  onClick={handleFindPartners}
                  disabled={!rpTopic.trim()}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    rpTopic.trim()
                      ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Find Conversation Partners
                </button>
              )}

              {/* Loading state */}
              {loadingPersonas && (
                <div className="flex items-center justify-center py-6 gap-3 text-primary-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Finding partners for your scenario…</span>
                </div>
              )}

              {/* Error state */}
              {personaError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  {personaError}
                  <button
                    type="button"
                    onClick={handleFindPartners}
                    className="block mx-auto mt-2 text-xs font-semibold text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* AI-generated persona cards */}
              {suggestedPersonas.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pick a conversation partner
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {suggestedPersonas.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPersona(p); setUseCustom(false); }}
                        className={`p-3 rounded-lg text-left transition-all duration-200 border-2 ${
                          selectedPersona?.id === p.id
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{p.emoji}</div>
                        <div className="text-sm font-semibold text-gray-800 leading-tight">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-snug">{p.traits}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom option — always available */}
                  <button
                    type="button"
                    onClick={() => { setUseCustom(true); setSelectedPersona(null); }}
                    className={`w-full py-2.5 rounded-lg border-2 border-dashed transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${
                      useCustom
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-500 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    <span>✍️</span> Or describe your own partner…
                  </button>

                  {useCustom && (
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Describe the personality, role, and behavior of your conversation partner..."
                      className="input-field min-h-[80px] resize-y text-sm mt-2"
                    />
                  )}

                  {/* Regenerate link */}
                  <button
                    type="button"
                    onClick={handleFindPartners}
                    className="mt-2 text-xs text-primary-500 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate partners
                  </button>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 pt-5">
              <button
                type="submit"
                disabled={suggestedPersonas.length === 0 && !useCustom}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ${
                  (selectedPersona || (useCustom && customDescription.trim()))
                    ? 'btn-primary'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Begin Roleplay
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* ── Accurate feature strip ── */}
        <div className="mt-10 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl mb-1">📝</div>
            <p className="text-sm text-gray-600 font-medium">AI-Generated Questions</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🎭</div>
            <p className="text-sm text-gray-600 font-medium">Live Conversation Practice</p>
          </div>
          <div>
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-sm text-gray-600 font-medium">Instant Feedback</p>
          </div>
        </div>
      </div>
    </div>
  );
}
