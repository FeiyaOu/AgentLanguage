# Onboarding Briefing Screen Implementation

## Question

> Let us start. First: Add an Onboarding "Briefing" Screen
> 
> Before the chat starts, show a scenario card with:
> - 🎬 Scene: "You're at an Italian restaurant..."
> - 🎭 Your Partner: "Marco is a grumpy waiter who..."
> - 🎯 Your Mission: "Successfully order a meal for two"
> - 💡 Tip: "Try to be polite even if he's rude!"
> - ▶️ [Start Conversation] button
> 
> This sets expectations and reduces confusion.
> Please do this for me and give me a summary of what you have done.

---

## Implementation Summary

### Changes Made to `frontend/src/pages/Roleplay.tsx`

**1. Added new state variable:**
```tsx
const [showBriefing, setShowBriefing] = useState(true);
```

**2. Modified `initializeRoleplay()` function:**

Before:
```tsx
const initializeRoleplay = async () => {
  try {
    setLoading(true);
    const data = await startRoleplay(topic, difficulty, personaType, customDescription);
    setRoleplay(data);
    
    // Add opening message
    setMessages([{
      type: 'persona',
      text: data.opening_line,
      timestamp: Date.now()
    }]);
  } catch (error) {
    console.error('Error starting roleplay:', error);
    alert('Failed to start roleplay session');
    navigate('/');
  } finally {
    setLoading(false);
  }
};
```

After:
```tsx
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
```

**3. Added `handleStartConversation()` function:**
```tsx
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
```

**4. Updated persona emoji mapping to include custom:**
```tsx
const personaEmoji = {
  grumpy_waiter: '😠',
  lost_tourist: '😰',
  strict_teacher: '👩‍🏫',
  friendly: '😊',
  custom: '✨'
}[roleplay.persona_type] || '🎭';
```

**5. Added dynamic tip generator function:**
```tsx
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
```

**6. Created the Briefing Card UI:**

```tsx
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
```

---

## Briefing Card Sections

| Section | Icon | Content Source |
|---------|------|----------------|
| **The Scene** | 🎬 | `roleplay.scene_context` |
| **Your Partner** | 🎭 | `roleplay.persona_name` + personality traits |
| **Your Mission** | 🎯 | `roleplay.user_goal` |
| **Pro Tip** | 💡 | Dynamic based on `persona_type` |
| **Difficulty Badge** | — | Shows beginner/intermediate/advanced with color coding |
| **Start Button** | ▶️ | Large CTA to begin conversation |
| **Back Link** | ← | Returns to home page |

---

## Dynamic Tips by Persona Type

| Persona | Tip |
|---------|-----|
| `grumpy_waiter` | "Try to stay polite even if they seem rude. Kill them with kindness!" |
| `lost_tourist` | "Speak clearly and offer helpful directions. They appreciate patience!" |
| `strict_teacher` | "Use proper grammar and complete sentences. They notice every detail!" |
| `friendly` | "Relax and be natural! This is a friendly conversation." |
| `custom` / default | "Be polite, stay in character, and have fun practicing!" |

---

## Updated User Flow

```
┌─────────┐     ┌───────────┐     ┌──────────────────┐     ┌──────────┐
│  Home   │ --> │  Loading  │ --> │ BRIEFING SCREEN  │ --> │   Chat   │
│  Page   │     │   Spinner │     │  (Mission Card)  │     │ Interface│
└─────────┘     └───────────┘     └──────────────────┘     └──────────┘
                                          │
                                          │ "Back to Home"
                                          v
                                    ┌─────────┐
                                    │  Home   │
                                    └─────────┘
```

**Before:** Home → Loading → Chat (confusing, no context)

**After:** Home → Loading → 📋 Briefing Card → Start → Chat (clear expectations!)

---

## Benefits

1. **Sets Expectations** — User knows exactly what scenario they're entering
2. **Reduces Confusion** — Clear mission objective eliminates guesswork
3. **Persona Context** — User understands who they're talking to and their personality
4. **Helpful Tips** — Practical advice tailored to each persona type
5. **Difficulty Awareness** — User knows what level of challenge to expect
6. **Easy Escape** — "Back to Home" link if they change their mind

---

*Document generated: January 28, 2026*
