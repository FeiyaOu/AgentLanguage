import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePractice } from '../api';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
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
      const result = await generatePractice(topic, difficulty);
      
      // Pass exercises to practice page
      navigate('/practice', { 
        state: { 
          exercises: result.exercises,
          topic,
          difficulty
        } 
      });
    } catch (error) {
      console.error('Error generating practice:', error);
      alert('Failed to generate exercises. Make sure the backend is running!');
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
                  Generating exercises...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Start Learning
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
