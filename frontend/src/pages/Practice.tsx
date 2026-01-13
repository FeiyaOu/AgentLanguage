import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Exercise } from '../types';
import { scoreAnswers } from '../api';

export default function Practice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exercises, topic, difficulty } = location.state as { 
    exercises: Exercise[]; 
    topic: string;
    difficulty: string;
  };

  const [answers, setAnswers] = useState<string[]>(new Array(exercises.length).fill(''));
  const [loading, setLoading] = useState(false);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check all answers are filled
    if (answers.some(a => !a.trim())) {
      alert('Please answer all questions');
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
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold capitalize">
              {difficulty}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800">
            Practice: <span className="text-primary-500">{topic}</span>
          </h1>
          <p className="text-gray-600 mt-2">
            {exercises.length} exercises • Answer all questions to get feedback
          </p>
        </div>

        {/* Exercises */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {exercises.map((exercise, index) => (
            <div key={index} className="card">
              <div className="flex items-start mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    {exercise.question}
                  </h3>
                  
                  {/* Multiple choice */}
                  {exercise.type === 'multiple_choice' && exercise.options ? (
                    <div className="space-y-2">
                      {exercise.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            answers[index] === option
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={answers[index] === option}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            className="mr-3"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    /* Text input for fill-in-blank or other types */
                    <input
                      type="text"
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder="Type your answer..."
                      className="input-field"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center">
                  Submit Answers
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
