import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ScoreResult, Exercise } from '../types';
import { generatePractice } from '../api';

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

  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    
    try {
      // Generate new practice with focus on weak areas
      const practiceResult = await generatePractice(
        topic,
        difficulty,
        result.weak_areas
      );
      
      navigate('/practice', { 
        state: { 
          exercises: practiceResult.exercises,
          topic,
          difficulty
        } 
      });
    } catch (error) {
      console.error('Error generating practice:', error);
      alert('Failed to generate new exercises. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreEmoji = (percentage: number) => {
    if (percentage >= 80) return '🎉';
    if (percentage >= 60) return '👍';
    return '💪';
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreEmoji(result.score_percentage)}</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Great Work!
          </h1>
          <p className="text-gray-600">Here's how you did</p>
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
          </div>
        </div>

        {/* Detailed Scores */}
        {result.detailed_scores && result.detailed_scores.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Question by Question</h2>
            <div className="space-y-3">
              {result.detailed_scores.map((score, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    score.correct
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
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
                    <div>
                      <p className="font-semibold text-gray-800">Question {score.question_num}</p>
                      <p className="text-sm text-gray-600">{score.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {result.weak_areas && result.weak_areas.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="mr-2">🎯</span>
              Areas to Focus On
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {result.weak_areas.map((area, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-gray-700">
                <span className="font-semibold text-blue-800">Tip: </span>
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
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Practice Weak Areas
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
