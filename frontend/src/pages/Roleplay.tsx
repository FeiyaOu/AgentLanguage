import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Roleplay as RoleplayType, RoleplayMessage } from '../types';
import { startRoleplay, sendRoleplayMessage, endRoleplay } from '../api';

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
      // Don't add opening message yet - wait until user starts conversation
    } catch (error) {
      console.error('Error starting roleplay:', error);
      alert('Failed to start roleplay session');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (!roleplay) return;
    
    // Add opening message when user starts
    setMessages([{
      type: 'persona',
      text: roleplay.opening_line,
      timestamp: Date.now()
    }]);
    setShowBriefing(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !roleplay) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Add user message to display
    const userMessage: RoleplayMessage = {
      type: 'user',
      text: userMsg,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    try {
      const response = await sendRoleplayMessage(roleplay.roleplay_id, userMsg, newTurnCount);

      if (response.type === 'coach') {
        // Show coach feedback modal
        setCoachFeedback(response);
        setShowCoachModal(true);
      } else {
        // Add persona response
        setMessages(prev => [...prev, response]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleResumeAfterCoach = () => {
    if (coachFeedback && coachFeedback.persona_resume) {
      // Add coach feedback summary to messages
      setMessages(prev => [...prev, {
        type: 'coach',
        text: `📝 Coach's Feedback: ${coachFeedback.encouragement}`,
        timestamp: Date.now()
      }]);

      // Add persona resume message
      setMessages(prev => [...prev, {
        type: 'persona',
        text: coachFeedback.persona_resume!,
        timestamp: Date.now()
      }]);
    }

    setShowCoachModal(false);
    setCoachFeedback(null);
  };

  const handleEndRoleplay = async () => {
    if (!roleplay) return;

    try {
      const result = await endRoleplay(roleplay.roleplay_id);
      alert(result.final_message);
      navigate('/');
    } catch (error) {
      console.error('Error ending roleplay:', error);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your roleplay...</p>
        </div>
      </div>
    );
  }

  if (!roleplay) {
    return null;
  }

  const personaEmoji = {
    grumpy_waiter: '😠',
    lost_tourist: '😰',
    strict_teacher: '👩‍🏫',
    friendly: '😊',
    custom: '✨'
  }[roleplay.persona_type] || '🎭';

  // Generate contextual tip based on persona type
  const getTip = () => {
    switch (roleplay.persona_type) {
      case 'grumpy_waiter':
        return "Try to stay polite even if they seem rude. Kill them with kindness!";
      case 'lost_tourist':
        return "Speak clearly and offer helpful directions. They appreciate patience!";
      case 'strict_teacher':
        return "Use proper grammar and complete sentences. They notice every detail!";
      case 'friendly':
        return "Relax and be natural! This is a friendly conversation.";
      default:
        return "Be polite, stay in character, and have fun practicing!";
    }
  };

  // Briefing Screen
  if (showBriefing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="max-w-xl w-full">
          {/* Briefing Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6 text-white text-center">
              <div className="text-5xl mb-3">{personaEmoji}</div>
              <h1 className="text-2xl font-bold">Mission Briefing</h1>
              <p className="text-primary-100 mt-1">Get ready for your conversation</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Scene */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">The Scene</h3>
                  <p className="text-gray-600">{roleplay.scene_context}</p>
                </div>
              </div>

              {/* Your Partner */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-2xl">🎭</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Your Partner</h3>
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-800">{roleplay.persona_name}</span>
                    {roleplay.persona_type !== 'custom' && (
                      <span className="text-gray-500"> — {
                        roleplay.persona_type === 'grumpy_waiter' ? 'impatient but fair if treated with respect' :
                        roleplay.persona_type === 'lost_tourist' ? 'confused and anxious, very grateful for help' :
                        roleplay.persona_type === 'strict_teacher' ? 'demanding, expects proper grammar' :
                        'warm, patient, and encouraging'
                      }</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Your Mission */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Your Mission</h3>
                  <p className="text-gray-600">{roleplay.user_goal}</p>
                </div>
              </div>

              {/* Tip Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">Pro Tip</h4>
                    <p className="text-yellow-700 text-sm">{getTip()}</p>
                  </div>
                </div>
              </div>

              {/* Difficulty Badge */}
              <div className="flex items-center justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                  difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8">
              <button
                onClick={handleStartConversation}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center space-x-2 rounded-xl"
              >
                <span>Start Conversation</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{personaEmoji}</div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{roleplay.persona_name}</h1>
                <p className="text-sm text-gray-600">{roleplay.scene_context}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{turnCount}</div>
                <div className="text-xs text-gray-500">Turns</div>
              </div>
              <button
                onClick={handleEndRoleplay}
                className="btn-secondary text-sm"
              >
                End Session
              </button>
            </div>
          </div>
          {/* Goal Banner */}
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">🎯 Your Goal:</span> {roleplay.user_goal}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type !== 'user' && (
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-xl">
                    {msg.type === 'coach' ? '🎓' : personaEmoji}
                  </div>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-primary-500 text-white'
                    : msg.type === 'coach'
                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.type === 'user' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                    👤
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
              placeholder="Type your response..."
              disabled={sending}
              className="flex-1 input-field"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sending}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Coach Feedback Modal */}
      {showCoachModal && coachFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎓</div>
                <h2 className="text-3xl font-bold text-gray-800">Coach's Feedback</h2>
                <p className="text-gray-600 mt-2">Let's review your performance!</p>
              </div>

              {/* Politeness Score */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Politeness</h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200">
                        Score
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        {coachFeedback.politeness_score}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                    <div
                      style={{ width: `${coachFeedback.politeness_score}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>
              </div>

              {/* Grammar Notes */}
              {coachFeedback.grammar_notes && coachFeedback.grammar_notes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">📝</span> Grammar Notes
                  </h3>
                  <ul className="space-y-2">
                    {coachFeedback.grammar_notes.map((note, idx) => (
                      <li key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vocabulary Suggestions */}
              {coachFeedback.vocab_suggestions && coachFeedback.vocab_suggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">💡</span> Vocabulary Tips
                  </h3>
                  <ul className="space-y-2">
                    {coachFeedback.vocab_suggestions.map((suggestion, idx) => (
                      <li key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Encouragement */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-900 font-medium">{coachFeedback.encouragement}</p>
              </div>

              {/* Resume Button */}
              <button
                onClick={handleResumeAfterCoach}
                className="btn-primary w-full text-lg py-4"
              >
                Continue Roleplay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
