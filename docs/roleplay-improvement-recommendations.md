# Roleplay Feature Analysis & Improvement Recommendations

## Question

> How to improve the roleplay design and interaction so users can enjoy this part? I also want this part to have a clearer interaction schema so users are not confused. If we should reduce or add anything, what would it be?

---

## Current State Summary

The roleplay allows users to select a topic, difficulty, and persona (4 preset + 1 custom), then chat with an AI character. Every 3 turns, a coach modal appears with feedback on politeness, grammar, and vocabulary.

---

## 🔴 Problems Identified

| Issue | Impact |
|-------|--------|
| **No onboarding** | Users jump into chat without understanding how roleplay works |
| **Unclear goal progression** | User doesn't know if they're succeeding or failing their goal |
| **Coach feels interruptive** | Modal pops up without warning, breaking immersion |
| **No conversation "ending"** | User doesn't know when they've accomplished their goal |
| **Lack of suggested responses** | Beginners may not know what to say next |
| **No difficulty adaptation** | Conversation doesn't adjust based on user performance |
| **No replay or save** | Can't review what was learned |

---

## 🟢 Recommended Improvements

### Phase 1: Clearer Interaction Flow (High Priority)

#### 1. Add an Onboarding "Briefing" Screen

Before the chat starts, show a **scenario card** with:
- 🎬 **Scene**: "You're at an Italian restaurant..."
- 🎭 **Your Partner**: "Marco is a grumpy waiter who..."
- 🎯 **Your Mission**: "Successfully order a meal for two"
- 💡 **Tip**: "Try to be polite even if he's rude!"
- ▶️ **[Start Conversation]** button

This sets expectations and reduces confusion.

#### 2. Goal Progress Indicator

Add a **progress bar** or **checklist** visible during chat:

```
🎯 Mission Progress:
☑️ Greet the waiter
☐ Ask for a table
☐ Order drinks
☐ Order food
☐ Ask for the bill
```

Updates in real-time as LLM detects completed steps.

#### 3. Inline Hints System (for Beginners)

Add a "💡 Stuck?" button that reveals:
- Suggested phrase: *"You could say: 'Excuse me, could I see the menu?'"*
- Or multiple options to choose from (reduces typing burden)

---

### Phase 2: Better Coach Integration (Medium Priority)

#### 4. Pre-announce Coach Feedback

Instead of a surprise modal:
- After turn 2, show a subtle banner: *"📝 Coach will check in after your next message..."*
- Makes it feel like a natural pause, not an interruption

#### 5. Mini Feedback Bubbles (Real-time)

Instead of only coach every 3 turns:
- Show small inline corrections as you go: 
  - `You: "I want coffee"` → 💡 *"Try: I'd like a coffee, please"*
- Make it toggleable (off for advanced users)

#### 6. Coach Feedback as Chat Message (not Modal)

Option to receive coach feedback as a special message in the chat timeline instead of a disruptive modal:

```
🎓 Coach: Nice job! Small tip: "Could I have..." sounds more polite than "Give me..."
```

---

### Phase 3: Engagement Features (Nice-to-Have)

#### 7. Scenario Completion & Summary

When the user accomplishes their goal:
- 🎉 **Congratulations!** modal with:
  - ⭐ Overall rating (1-5 stars)
  - 📊 Stats: Turns taken, politeness average, grammar score
  - 📝 Key phrases learned
  - 🔄 **[Try Again]** or **[New Scenario]** buttons

#### 8. Quick Reply Chips

Show 2-3 contextual response options as clickable chips:

```
[Could I see the menu?] [Is this table available?] [Hello, how are you?]
```

Helps beginners and speeds up interaction.

#### 9. Typing Indicator

Add a "Marco is typing..." animation when waiting for persona response (immersion).

#### 10. Scenario Templates (Quick Start)

Pre-built complete scenarios instead of just topic + persona:
- ☕ "Ordering at a Café" (Friendly barista)
- ✈️ "Airport Check-in" (Busy agent)
- 🏨 "Hotel Complaint" (Strict manager)
- 🚕 "Taxi Negotiation" (Chatty driver)

---

## 📋 Summary: What to Add vs Remove

### ➕ Add

| Feature | Effort | Impact |
|---------|--------|--------|
| Onboarding briefing screen | Medium | High |
| Goal progress indicator | Medium | High |
| Quick reply chips | Low | High |
| Typing indicator | Low | Medium |
| Scenario completion summary | Medium | High |
| Inline correction hints | Medium | High |
| Scenario templates | Low | Medium |

### ➖ Consider Removing/Changing

| Feature | Issue | Recommendation |
|---------|-------|----------------|
| Coach modal popup | Interruptive | Make it inline chat message or optional |
| Fixed 3-turn interval | Arbitrary | Make it dynamic based on errors detected |
| Generic "End Session" | Abrupt | Replace with "Complete Mission" when goal is achieved |

---

## 🚀 Quick Win Implementation Order

1. **Briefing screen** (biggest clarity improvement)
2. **Quick reply chips** (easiest to implement, big UX boost)
3. **Goal progress indicator** (makes purpose clear)
4. **Typing indicator** (30 minutes, adds polish)
5. **Inline coach option** (replace modal)

---

## Conclusion

The core roleplay mechanics are solid, but the user experience lacks **clarity** and **guidance**. The biggest wins come from:

1. Setting expectations upfront (briefing screen)
2. Showing progress toward the goal
3. Providing response suggestions for beginners
4. Making coach feedback feel natural, not interruptive

These changes transform roleplay from a confusing chat into a **guided, game-like learning experience**.

---

*Document generated: January 28, 2026*
