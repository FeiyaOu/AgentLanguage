# Language Learning Agent — LangChain Rebuild Specification

> **Purpose**: This document fully specifies the AI Language Learning Agent so it can be rebuilt from scratch using **LangChain** as the agent framework. The existing React frontend and FastAPI route structure are preserved unchanged. Only the `backend/agent/` internals are re-implemented.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Frontend (Keep As-Is)](#4-frontend-keep-as-is)
5. [Backend: FastAPI Routes & Models](#5-backend-fastapi-routes--models)
6. [Backend: Rate Limiting & Session Management (Keep As-Is)](#6-backend-rate-limiting--session-management-keep-as-is)
7. [Backend: Agent Layer (REWRITE with LangChain)](#7-backend-agent-layer-rewrite-with-langchain)
8. [Tool Specifications](#8-tool-specifications)
9. [Prompt Templates](#9-prompt-templates)
10. [Data Contracts (TypeScript ↔ Python)](#10-data-contracts-typescript--python)
11. [Configuration & Constants](#11-configuration--constants)
12. [File Structure (Target)](#12-file-structure-target)
13. [Migration Notes](#13-migration-notes)

---

## 1. Project Overview

An AI-powered English language learning app with two main features:

- **Exercise Practice** — AI generates interactive exercises (multiple choice, fill-in-the-blank, sentence reordering). User answers are scored with detailed per-question feedback and weak-area analysis. An inline AI tutor answers follow-up questions.
- **Roleplay Chat** — User picks a real-world scenario and an AI-generated conversation partner (persona). They role-play a goal-directed conversation with turn limits, goal tracking, and an optional "coach" that gives grammar/vocabulary/politeness feedback.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│  React Frontend (Vite + TailwindCSS)             │
│  Pages: Home → Practice → Feedback               │
│          Home → Roleplay                         │
│  Communicates via REST (axios → localhost:8000)   │
└────────────┬─────────────────────────────────────┘
             │ HTTP POST
┌────────────▼─────────────────────────────────────┐
│  FastAPI Backend (localhost:8000)                 │
│  ┌─────────────────────────────────────────────┐ │
│  │ Middleware: CORS                            │ │
│  │ Rate Limiting: RateLimiter (per-IP)         │ │
│  │ Session Mgmt: in-memory dict + GC           │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │ Agent Layer (LangChain) ← THIS IS REWRITTEN│ │
│  │  • ChatOpenAI (gpt-4o-mini)                │ │
│  │  • LangChain Tools (4 tools)               │ │
│  │  • AgentExecutor or direct chain calls      │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Frontend (unchanged)
| Dependency | Version |
|---|---|
| React | 19.x |
| react-router-dom | 7.x |
| Vite | 7.x |
| TailwindCSS | 3.4.x |
| framer-motion | 12.x |
| @heroicons/react | 2.x |
| axios | 1.x |
| TypeScript | 5.9.x |

### Backend (updated)
| Dependency | Version | Notes |
|---|---|---|
| FastAPI | ≥0.109.0 | Unchanged |
| uvicorn | ≥0.27.0 | Unchanged |
| python-dotenv | ≥1.0.0 | Unchanged |
| **langchain** | ≥0.2.0 | **NEW** — core framework |
| **langchain-openai** | ≥0.1.0 | **NEW** — ChatOpenAI wrapper |
| **langchain-core** | ≥0.2.0 | **NEW** — base types |
| openai | ≥1.12.0 | Still needed for type hints / fallback |

---

## 4. Frontend (Keep As-Is)

The frontend is a React SPA with 4 pages. **Do not modify any frontend code.** The backend must match the existing API contracts exactly.

### Pages & Routes

| Route | Page Component | Purpose |
|---|---|---|
| `/` | `Home.tsx` | Landing page: pick Exercise or Roleplay, set topic + difficulty. For roleplay: "Find Partners" calls `POST /api/suggest-personas`, then user picks a persona. |
| `/practice` | `Practice.tsx` | Fetches exercises (`POST /api/generate-practice`), renders interactive exercise cards (MCQ, Banked Cloze, Sentence Reordering). Submits answers (`POST /api/score-answers`). |
| `/feedback` | `Feedback.tsx` | Shows per-question score breakdown. Each question has an "Ask AI Tutor" button → inline chat modal (`POST /api/ask-tutor`). Has "Practice Weak Areas" button to regenerate exercises. Turn-capped (3/question, 15/session) and word-limited (50 words/message). |
| `/roleplay` | `Roleplay.tsx` | Real-time chat with AI persona. Mission briefing → conversation → optional coach hints. Turn indicator, goal progress bar, achievement detection. Word-limited (100 words/message), hint-limited (3/session). Handles 429 and 410 errors gracefully. |

### Frontend TypeScript Types (`types.ts`)

```typescript
export interface Exercise {
  question: string;
  type: string;                  // "multiple_choice" | "banked_cloze" | "sentence_reordering"
  correct_answer: string;
  options?: string[];
  tokens?: string[];             // Only for sentence_reordering
}

export interface ScoreResult {
  total_score: string;           // "3/5"
  score_percentage: number;      // 0-100
  detailed_scores: Array<{
    question_num: number;
    correct: boolean;
    feedback: string;
    question?: string;
    user_answer?: string;
    correct_answer?: string;
  }>;
  weak_areas: string[];
  recommendations: string;
  suggested_exercise_type?: string;
}

export interface SuggestedPersona {
  id: string;
  emoji: string;
  name: string;
  traits: string;
}

export interface Roleplay {
  roleplay_id: string;
  persona_name: string;
  persona_type: string;
  opening_line: string;
  scene_context: string;
  user_goal: string;
  max_turns?: number;
}

export interface RoleplayMessage {
  type: 'user' | 'persona' | 'coach' | 'system';
  text: string;
  turn_count?: number;
  timestamp?: number;
  goal_progress?: number;
  goal_status?: 'in_progress' | 'off_track' | 'achieved';
  achieved?: boolean;
  turns_remaining?: number;
  session_over?: boolean;
  final_message?: string;
  politeness_score?: number;
  grammar_notes?: string[];
  vocab_suggestions?: string[];
  encouragement?: string;
  persona_resume?: string;
}
```

### Frontend API Layer (`api.ts`)

All 8 API calls the frontend makes:

| Function | Method | Endpoint | Request Body | Response |
|---|---|---|---|---|
| `generatePractice(topic, difficulty, focusAreas)` | POST | `/api/generate-practice` | `{topic, difficulty, focus_areas}` | `{exercises: Exercise[], message: string}` |
| `scoreAnswers(exercises, answers)` | POST | `/api/score-answers` | `{exercises, answers}` | `ScoreResult` |
| `askTutor(question, context?, history?)` | POST | `/api/ask-tutor` | `{question, context?, history?}` | `{answer: string}` |
| `resetSession()` | POST | `/api/reset` | `{}` | `{status, message}` |
| `suggestPersonas(scenario, difficulty)` | POST | `/api/suggest-personas` | `{scenario, difficulty}` | `{personas: SuggestedPersona[]}` |
| `startRoleplay(topic, difficulty, personaType, customDesc?)` | POST | `/api/start-roleplay` | `{topic, difficulty, persona_type, custom_description?}` | `Roleplay` |
| `sendRoleplayMessage(roleplayId, userMessage, turnCount)` | POST | `/api/roleplay-message` | `{roleplay_id, user_message, turn_count}` | Mapped to `RoleplayMessage` |
| `getRoleplayHint(roleplayId, turnCount)` | POST | `/api/roleplay-message` | `{roleplay_id, user_message:"", turn_count, mode:"hint", consume_turn:false}` | Mapped to `RoleplayMessage` (coach) |
| `endRoleplay(roleplayId)` | POST | `/api/end-roleplay` | `{roleplay_id}` | `{final_message, total_turns}` |

---

## 5. Backend: FastAPI Routes & Models

### Pydantic Request/Response Models

These must remain **identical** so the frontend continues to work.

```python
# --- Exercise Flow ---
class GeneratePracticeRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    focus_areas: List[str] = []

class Exercise(BaseModel):
    question: str
    type: str
    correct_answer: str
    options: List[str] = []
    tokens: List[str] = []

class GeneratePracticeResponse(BaseModel):
    exercises: List[Exercise]
    message: str

class ScoreAnswersRequest(BaseModel):
    exercises: List[Dict[str, Any]]
    answers: List[str]

class ScoreAnswersResponse(BaseModel):
    total_score: str
    score_percentage: int
    detailed_scores: List[Dict[str, Any]]
    weak_areas: List[str]
    recommendations: str
    suggested_exercise_type: Optional[str] = None

# --- Tutor ---
class ChatMessage(BaseModel):
    role: str
    content: str

class AskTutorRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None
    history: List[ChatMessage] = []

class AskTutorResponse(BaseModel):
    answer: str

# --- Roleplay ---
class SuggestPersonasRequest(BaseModel):
    scenario: str
    difficulty: str = "beginner"

class SuggestedPersona(BaseModel):
    id: str
    emoji: str
    name: str
    traits: str

class SuggestPersonasResponse(BaseModel):
    personas: List[SuggestedPersona]

class StartRoleplayRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    persona_type: str = "friendly"
    custom_description: Optional[str] = None

class StartRoleplayResponse(BaseModel):
    roleplay_id: str
    persona_name: str
    persona_type: str
    opening_line: str
    scene_context: str
    user_goal: str
    max_turns: int

class RoleplayMessageRequest(BaseModel):
    roleplay_id: str
    user_message: str
    turn_count: int
    mode: Optional[str] = None      # "chat" | "hint"
    consume_turn: Optional[bool] = None

class RoleplayMessageResponse(BaseModel):
    type: str                                    # "dialogue" | "coach_feedback" | "session_end"
    persona_response: Optional[str] = None
    goal_progress: Optional[int] = None          # 0-100
    goal_status: Optional[str] = None            # "in_progress" | "off_track" | "achieved"
    achieved: Optional[bool] = None
    turns_remaining: Optional[int] = None
    session_over: Optional[bool] = None
    final_message: Optional[str] = None
    politeness_score: Optional[int] = None       # 0-100
    grammar_notes: Optional[List[str]] = None
    vocab_suggestions: Optional[List[str]] = None
    encouragement: Optional[str] = None
    persona_resume: Optional[str] = None

class EndRoleplayRequest(BaseModel):
    roleplay_id: str

class EndRoleplayResponse(BaseModel):
    final_message: str
    total_turns: int
```

### Route Endpoints (8 total)

| # | Method | Path | Rate Limiter | Auth | Notes |
|---|---|---|---|---|---|
| 1 | GET | `/` | None | None | Health check → `{status: "ok"}` |
| 2 | POST | `/api/generate-practice` | None | None | Calls `generate_practice` tool via agent |
| 3 | POST | `/api/score-answers` | None | None | Hybrid scoring: deterministic + AI feedback |
| 4 | POST | `/api/ask-tutor` | `tutor_limiter` (10/min, 30/hr) | None | Direct LLM call (not agent loop), 50-word limit |
| 5 | POST | `/api/reset` | None | None | Reset agent state |
| 6 | POST | `/api/suggest-personas` | `persona_suggest_limiter` (5/min, 15/hr) | None | Generate 4 personas for scenario |
| 7 | POST | `/api/start-roleplay` | `roleplay_start_limiter` (5/min, 15/hr) | None | Concurrent session cap (2/IP), GC, creates session |
| 8 | POST | `/api/roleplay-message` | `roleplay_msg_limiter` (12/min, 60/hr) | None | 100-word cap, 3-hint cap, TTL check, turn cap |
| 9 | POST | `/api/end-roleplay` | None | None | Cleanup session + IP tracker |

---

## 6. Backend: Rate Limiting & Session Management (Keep As-Is)

### RateLimiter Class

Sliding-window, in-memory, per-IP. Keep this exactly as implemented:

```python
class RateLimiter:
    def __init__(self, per_minute: int = 10, per_hour: int = 30):
        self.per_minute = per_minute
        self.per_hour = per_hour
        self._hits: Dict[str, list] = defaultdict(list)

    def _prune(self, ip: str) -> None:
        cutoff = time.time() - 3600
        self._hits[ip] = [t for t in self._hits[ip] if t > cutoff]

    def check(self, ip: str) -> Optional[str]:
        now = time.time()
        self._prune(ip)
        timestamps = self._hits[ip]
        recent_minute = [t for t in timestamps if t > now - 60]
        if len(recent_minute) >= self.per_minute:
            return f"Rate limit exceeded — max {self.per_minute} requests per minute."
        if len(timestamps) >= self.per_hour:
            return f"Rate limit exceeded — max {self.per_hour} requests per hour."
        return None

    def record(self, ip: str) -> None:
        self._hits[ip].append(time.time())
```

### Limiter Instances

```python
tutor_limiter          = RateLimiter(per_minute=10, per_hour=30)
roleplay_start_limiter = RateLimiter(per_minute=5,  per_hour=15)
roleplay_msg_limiter   = RateLimiter(per_minute=12, per_hour=60)
persona_suggest_limiter= RateLimiter(per_minute=5,  per_hour=15)
```

### Session Management Constants

```python
MAX_SESSIONS_PER_IP    = 2
MAX_HINTS_PER_SESSION  = 3
SESSION_TTL_SECONDS    = 30 * 60   # 30 minutes
MAX_ROLEPLAY_MSG_WORDS = 100
```

### Session Storage

```python
roleplay_sessions: Dict[str, Dict[str, Any]] = {}    # {roleplay_id: session_dict}
_ip_sessions: Dict[str, set] = defaultdict(set)       # {ip: {roleplay_id, ...}}
```

### Session Dict Shape

Each session stored in `roleplay_sessions[roleplay_id]`:

```python
{
    "topic": str,
    "difficulty": str,
    "persona_type": str,
    "persona_name": str,
    "conversation_history": List[{"role": str, "message": str}],
    "turn_count": int,
    "scene_context": str,
    "user_goal": str,
    "goal_progress": int,        # 0-100
    "max_turns": int,            # 6/7/8 based on difficulty
    "custom_description": Optional[str],
    "hint_count": int,
    "last_active": float,        # time.time()
    "client_ip": str,
}
```

### Garbage Collection

```python
def _gc_expired_sessions() -> None:
    now = time.time()
    expired = [rid for rid, s in roleplay_sessions.items()
               if now - s.get("last_active", 0) > SESSION_TTL_SECONDS]
    for rid in expired:
        sess = roleplay_sessions.pop(rid, None)
        if sess:
            _ip_sessions.get(sess.get("client_ip", ""), set()).discard(rid)
```

Called at the start of `start_roleplay` endpoint.

---

## 7. Backend: Agent Layer (REWRITE with LangChain)

This is the **only part that changes**. Replace the current custom agent loop with LangChain.

### Current Architecture (to be replaced)

```
agent/
  agent.py    ← Custom while-loop agent with regex parsing (THOUGHT/TOOL/RESPONSE)
  tools.py    ← Custom Tool base class, 4 tool subclasses, each with direct OpenAI calls
  prompts.py  ← Text-based system prompt with THOUGHT/TOOL format instructions
```

### Target Architecture (LangChain)

```
agent/
  agent.py    ← LangChain AgentExecutor or RunnableSequence wrapping ChatOpenAI
  tools.py    ← LangChain @tool functions (or BaseTool subclasses)
  prompts.py  ← LangChain ChatPromptTemplate / SystemMessage
  __init__.py
```

### LangChain Agent Design

**Recommended approach: OpenAI Function Calling Agent** (not ReAct text parsing).

```python
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool

# LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=1000)

# Agent prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])

# Tools
tools = [generate_practice_tool, score_and_analyze_tool]

# Agent
agent = create_openai_functions_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=5, verbose=False)
```

### What the Agent Class Must Expose

The `main.py` routes call into the agent. These are the required public methods:

```python
class LanguageLearningAgent:
    def __init__(self, api_key: str): ...

    def process_user_input(self, user_input: str) -> str:
        """Run the agent loop. Returns the final text response."""

    def get_current_exercises(self) -> List[Dict]:
        """Return exercises generated by the last generate_practice tool call."""

    def get_last_score_result(self) -> Optional[Dict]:
        """Return scoring result from the last score_and_analyze tool call."""

    def reset(self):
        """Clear conversation history and cached results."""

    # Also needed for direct LLM access in some routes:
    @property
    def client(self):
        """Return the underlying OpenAI client (or ChatOpenAI instance)."""
```

### Important: Some Routes Bypass the Agent

Not every endpoint uses the agent loop. Several call the LLM directly:

| Endpoint | Uses Agent Loop? | Notes |
|---|---|---|
| `/api/generate-practice` | **YES** | Agent decides to call `generate_practice` tool |
| `/api/score-answers` | **NO** | Directly instantiates `ScoreAndAnalyzeTool` for AI feedback, plus deterministic scoring |
| `/api/ask-tutor` | **NO** | Direct `ChatOpenAI` call with simple system prompt |
| `/api/suggest-personas` | **NO** | Direct `ChatOpenAI` call |
| `/api/start-roleplay` | **NO** | Directly calls `RoleplayTool` |
| `/api/roleplay-message` | **NO** | Directly calls `RoleplayResponseTool` |

**Design implication**: The LangChain tools need to be usable both inside the AgentExecutor AND standalone (called directly from routes). Use `@tool` decorator functions that accept explicit parameters.

---

## 8. Tool Specifications

### Tool 1: `generate_practice`

**Purpose**: Generate 5 interactive English practice exercises.

| Field | Value |
|---|---|
| Input | `topic: str`, `difficulty: str` (beginner/intermediate/advanced), `focus_areas: List[str]` (optional) |
| Output | JSON array of 5 exercise objects |
| Model | gpt-4o-mini |
| Temperature | 0.7 |
| max_tokens | (default ~1000) |

**Exercise types (only these 3)**:
1. `multiple_choice` — 4 options, 1 correct
2. `banked_cloze` — sentence with `___` blank + options bank
3. `sentence_reordering` — shuffled word tokens, user reorders

**Output schema** (JSON array):
```json
[
  {
    "question": "string",
    "type": "multiple_choice",
    "correct_answer": "string",
    "options": ["a", "b", "c", "d"]
  },
  {
    "question": "The apple ___ red.",
    "type": "banked_cloze",
    "correct_answer": "is",
    "options": ["are", "is", "am", "be"]
  },
  {
    "question": "Reorder the words to form a correct sentence.",
    "type": "sentence_reordering",
    "correct_answer": "I drink coffee in the morning.",
    "tokens": ["morning", "drink", "I", "coffee", "in", "the"]
  }
]
```

### Tool 2: `score_and_analyze`

**Purpose**: Score user answers and provide detailed feedback + weak area analysis.

| Field | Value |
|---|---|
| Input | `exercises: List[Dict]`, `answers: List[str]` |
| Output | JSON object with scores, feedback, weak areas |
| Model | gpt-4o-mini |
| Temperature | 0.5 |

**Output schema**:
```json
{
  "total_score": "3/5",
  "score_percentage": 60,
  "detailed_scores": [
    {
      "question_num": 1,
      "question": "...",
      "user_answer": "...",
      "correct_answer": "...",
      "correct": true,
      "feedback": "..."
    }
  ],
  "weak_areas": ["ordering drinks", "polite phrases"],
  "recommendations": "Focus on using 'would like'...",
  "suggested_exercise_type": "banked_cloze"
}
```

**Important**: The `/api/score-answers` endpoint uses **hybrid scoring**:
- **Deterministic** for `multiple_choice`, `banked_cloze`, `sentence_reordering` (normalized string comparison)
- **AI feedback** merged in from the tool output (per-question feedback, weak areas, recommendations)
- The route merges both sources. See the existing `score_answers()` function in `main.py` for the full logic.

### Tool 3: `start_roleplay`

**Purpose**: Generate an opening scene for a roleplay scenario.

| Field | Value |
|---|---|
| Input | `scenario: str`, `persona_type: str`, `difficulty: str`, `custom_description: str` (optional) |
| Output | JSON object with persona info and opening line |
| Model | gpt-4o-mini |
| Temperature | 0.8 |
| max_tokens | 300 |

**Built-in persona configs** (used when `persona_type != "custom"`):
```python
{
    "grumpy_waiter":    {"name": "Marco the Grumpy Waiter",     "traits": "impatient, easily annoyed, but secretly fair"},
    "lost_tourist":     {"name": "Sophie the Lost Tourist",      "traits": "confused, anxious, broken English, very grateful"},
    "strict_teacher":   {"name": "Ms. Chen the Strict Teacher",  "traits": "demanding, corrects mistakes immediately"},
    "friendly":         {"name": "Alex the Friendly Local",      "traits": "warm, patient, helpful, encourages you"}
}
```

When `persona_type == "custom"`, use `custom_description` as traits and ask the LLM to create a name.

**Output schema**:
```json
{
  "persona_name": "Marco the Grumpy Waiter",
  "persona_type": "grumpy_waiter",
  "opening_line": "What do you want? Can't you see we're busy?",
  "scene_context": "A crowded Italian restaurant during lunch rush",
  "user_goal": "Successfully order a meal despite the waiter's attitude"
}
```

### Tool 4: `roleplay_respond`

**Purpose**: Generate in-character dialogue OR coach feedback during a roleplay session.

| Field | Value |
|---|---|
| Input | `persona_type, persona_name, conversation_history, user_message, turn_count, scenario, scene_context, user_goal, turns_remaining, mode` |
| Output | JSON object (dialogue or coach_feedback) |
| Model | gpt-4o-mini |
| Temperature | 0.7 |
| max_tokens | 250 (chat) / 400 (hint) |
| History trimming | `conversation_history[-8:]` for chat mode, `[-6:]` for hint mode |

**Two modes:**

#### Mode: `chat` (default)
Returns in-character persona response + goal tracking.

```json
{
  "type": "dialogue",
  "persona_response": "Ah, you want the pasta? Good choice...",
  "goal_progress": 45,
  "goal_status": "in_progress",
  "achieved": false
}
```

#### Mode: `hint`
Returns coach feedback with grammar/vocab/politeness analysis.

```json
{
  "type": "coach_feedback",
  "politeness_score": 82,
  "grammar_notes": ["'I want pasta' → 'I would like the pasta, please'"],
  "vocab_suggestions": ["Use 'recommend' instead of 'suggest' in restaurant context"],
  "encouragement": "Try asking about today's specials to advance toward your goal.",
  "persona_resume": "",
  "goal_progress": 45,
  "goal_status": "in_progress",
  "achieved": false
}
```

---

## 9. Prompt Templates

### Agent System Prompt (for Exercise flow)

```
You are an intelligent language learning agent. Your goal is to help users learn English through practice.

You have access to these tools:
1. generate_practice - Creates practice exercises based on topic and focus areas
2. score_and_analyze - Scores answers and identifies weak areas

Your workflow:
1. When user says what they want to learn, use generate_practice tool
2. Present exercises to user
3. After user answers, use score_and_analyze tool
4. Based on weak areas, generate targeted practice with generate_practice again
5. Continue this loop to help user improve
```

### Tutor System Prompt (for `/api/ask-tutor`)

```
You are a friendly, encouraging English-language tutor.
Answer the student's question clearly and concisely.
Use simple examples when helpful. Keep answers under 50 words.

[If context is provided]:
The student is asking about this exercise:
Question: {question}
Student's answer: {user_answer}
Correct answer: {correct_answer}
Feedback: {feedback}
```

**Tutor LLM call**: `max_tokens=100`, `temperature=0.7`, history capped at last 10 messages.

### Persona Suggestion Prompt (for `/api/suggest-personas`)

```
Given this English-learning roleplay scenario: "{scenario}"
Difficulty level: {difficulty}

Generate exactly 4 conversation-partner personas that would naturally appear in this scenario.
Each persona should have a distinct personality that creates a different conversational challenge.

Return ONLY a JSON array with this structure:
[
  {
    "id": "unique_snake_case_id",
    "emoji": "a single emoji that represents this character",
    "name": "Character Name (e.g. Marco the Waiter)",
    "traits": "Brief personality description, 8-15 words"
  }
]

Rules:
- Every persona MUST make sense for the scenario
- Vary the difficulty: one easy/friendly, one moderate, one challenging
- Use creative but realistic character names
- The 4th persona can be more unusual or humorous
- traits should hint at how they'll behave in conversation
```

**LLM call**: `max_tokens=300`, `temperature=0.8`.

---

## 10. Data Contracts (TypeScript ↔ Python)

The frontend sends snake_case JSON. The backend receives snake_case Pydantic models. No transformation needed.

Critical mapping for `roleplay-message` response → frontend `RoleplayMessage`:
- `type: "dialogue"` → `{type: 'persona', text: data.persona_response}`
- `type: "coach_feedback"` → `{type: 'coach', text: data.encouragement}`
- `type: "session_end"` → `{type: 'system', text: data.final_message, session_over: true}`

---

## 11. Configuration & Constants

### Environment Variables
```
OPENAI_API_KEY=sk-...
```

### Backend Constants
```python
# Max turns per difficulty
MAX_TURNS = {"beginner": 6, "intermediate": 7, "advanced": 8}

# Rate limits
TUTOR_RATE        = (10, 30)   # per_minute, per_hour
RP_START_RATE     = (5, 15)
RP_MSG_RATE       = (12, 60)
PERSONA_RATE      = (5, 15)

# Session limits
MAX_SESSIONS_PER_IP    = 2
MAX_HINTS_PER_SESSION  = 3
SESSION_TTL_SECONDS    = 1800   # 30 min
MAX_ROLEPLAY_MSG_WORDS = 100
MAX_TUTOR_MSG_WORDS    = 50
```

### CORS Origins
```python
[
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
    "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
    "http://localhost:3000", "http://127.0.0.1:3000",
]
```

---

## 12. File Structure (Target)

```
Agent-LanguageAssistant/
├── README.md
├── requirements.txt
├── backend/
│   ├── main.py              ← FastAPI routes, rate limiting, session mgmt
│   ├── requirements.txt     ← Add langchain, langchain-openai, langchain-core
│   ├── cli.py               ← Optional CLI (update to use LangChain agent)
│   └── agent/
│       ├── __init__.py
│       ├── agent.py          ← LangChain AgentExecutor setup
│       ├── tools.py          ← LangChain @tool functions
│       └── prompts.py        ← ChatPromptTemplate definitions
├── frontend/                 ← UNCHANGED — copy as-is
│   ├── src/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Practice.tsx
│   │   │   ├── Feedback.tsx
│   │   │   └── Roleplay.tsx
│   │   └── ...
│   ├── package.json
│   └── ...
└── docs/
```

---

## 13. Migration Notes

### What stays the same
- **All frontend code** — zero changes
- **All Pydantic request/response models** — exact same shapes
- **All FastAPI route handlers** — same paths, same logic, same rate limiting
- **RateLimiter class** — keep as-is
- **Session management** (roleplay_sessions, _ip_sessions, GC) — keep as-is
- **Hybrid scoring logic** in `/api/score-answers` — keep deterministic + AI merge

### What changes
- `agent/agent.py` → Replace custom while-loop with `AgentExecutor` or `RunnableSequence`
- `agent/tools.py` → Replace `Tool` base class with LangChain `@tool` or `BaseTool`
- `agent/prompts.py` → Replace raw string with `ChatPromptTemplate`
- `requirements.txt` → Add `langchain`, `langchain-openai`, `langchain-core`

### Key LangChain patterns to use

1. **Tools callable standalone**: Since routes like `start-roleplay` and `roleplay-message` call tools directly (not via agent loop), define tools as regular functions decorated with `@tool`, so they can be called as `my_tool.invoke({"param": "value"})` OR passed to `AgentExecutor`.

2. **JSON output parsing**: Replace the custom `_extract_json()` helper with LangChain's `JsonOutputParser` or keep a simple utility — the current one is robust and battle-tested.

3. **Conversation memory**: For the agent loop (exercise flow), consider `ConversationBufferWindowMemory(k=10)`. For roleplay, the session dict already manages history — no LangChain memory needed.

4. **Model parameters**: Use `ChatOpenAI(model="gpt-4o-mini", temperature=X, max_tokens=Y)` with different instances or `.bind()` for different temperature/token settings per tool.

---

## Appendix: Quick Reference — Error Codes the Frontend Handles

| HTTP Status | Meaning | Frontend Behavior |
|---|---|---|
| 429 | Rate limit exceeded | Shows error banner (Roleplay, Feedback, Home) |
| 410 | Session expired (TTL) | Shows "Session expired" banner in Roleplay |
| 400 | Word count / validation error | Shows inline error |
| 404 | Session not found | Error toast |
| 500 | Server error | Generic error message |
