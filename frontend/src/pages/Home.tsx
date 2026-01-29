import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePractice } from '../api';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [mode, setMode] = useState<'exercise' | 'roleplay'>('exercise');
  const [personaType, setPersonaType] = useState('friendly');
  const [customDescription, setCustomDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    setLoading(true);
    
    try {
      if (mode === 'roleplay') {
        // Navigate to roleplay mode
        navigate('/roleplay', {
          state: {
            topic,
            difficulty,
            personaType,
            customDescription: personaType === 'custom' ? customDescription : undefined
          }
        });
      } else {
        // Generate exercises and navigate to practice
        const result = await generatePractice(topic, difficulty);
        
        navigate('/practice', { 
          state: { 
            exercises: result.exercises,
            topic,
            difficulty
          } 
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start session. Make sure the backend is running!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-primary-100 rounded-2xl mb-4">
            <svg className="w-16 h-16 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Language Learning <span className="text-primary-500">Agent</span>
          </h1>
          <p className="text-xl text-gray-600">
            Start your journey with adaptive AI-powered practice
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Choose Practice Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('exercise')}
                  className={`py-4 px-4 rounded-lg font-medium transition-all duration-200 ${
                    mode === 'exercise'
                      ? 'bg-primary-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div>Exercise Mode</div>
                  <div className="text-xs opacity-75 mt-1">Answer questions</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('roleplay')}
                  className={`py-4 px-4 rounded-lg font-medium transition-all duration-200 ${
                    mode === 'roleplay'
                      ? 'bg-primary-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">🎭</div>
                  <div>Roleplay Mode</div>
                  <div className="text-xs opacity-75 mt-1">Interactive conversation</div>
                </button>
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <label htmlFor="topic" className="block text-sm font-semibold text-gray-700 mb-2">
                What would you like to learn?
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., restaurant English, travel phrases, business meetings..."
                className="input-field"
                disabled={loading}
              />
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Choose your level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 capitalize ${
                      difficulty === level
                        ? 'bg-primary-500 text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={loading}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona Selection (only for roleplay mode) */}
            {mode === 'roleplay' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choose your conversation partner
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { value: 'friendly', emoji: '😊', label: 'Friendly Helper' },
                    { value: 'grumpy_waiter', emoji: '😠', label: 'Grumpy Waiter' },
                    { value: 'lost_tourist', emoji: '😰', label: 'Lost Tourist' },
                    { value: 'strict_teacher', emoji: '👩‍🏫', label: 'Strict Teacher' },
                    { value: 'custom', emoji: '✍️', label: 'Custom Partner' }
                  ].map((persona) => (
                    <button
                      key={persona.value}
                      type="button"
                      onClick={() => {
                        setPersonaType(persona.value);
                        if (persona.value !== 'custom') {
                          setCustomDescription('');
                        }
                      }}
                      className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                        personaType === persona.value
                          ? 'bg-primary-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      disabled={loading}
                    >
                      <div className="text-2xl mb-1">{persona.emoji}</div>
                      <div className="text-sm">{persona.label}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Persona Description */}
                {personaType === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="customDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                        Describe your conversation partner
                      </label>
                      <textarea
                        id="customDescription"
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Describe the personality, role, and behavior of your conversation partner..."
                        className="input-field min-h-[100px] resize-y"
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">💡 Try these examples (click to use):</p>
                      <div className="space-y-2">
                        {[
                          "A shy barista at a busy café who loves talking about coffee but gets nervous speaking English with customers",
                          "An enthusiastic street vendor at a night market who speaks very fast and uses lots of local slang",
                          "A busy hotel receptionist who is always polite but constantly multitasking and in a hurry"
                        ].map((example, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomDescription(example)}
                            className="w-full text-left text-xs p-2 rounded border border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                            disabled={loading}
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'roleplay' ? 'Starting roleplay...' : 'Generating exercises...'}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {mode === 'roleplay' ? 'Begin Roleplay' : 'Start Learning'}
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm text-gray-600 font-medium">Adaptive Learning</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm text-gray-600 font-medium">AI-Powered</p>
          </div>
          <div>
            <div className="text-3xl mb-2">📈</div>
            <p className="text-sm text-gray-600 font-medium">Track Progress</p>
          </div>
        </div>
      </div>
    </div>
  );
}
