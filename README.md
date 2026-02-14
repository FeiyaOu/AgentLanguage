# TalkTutor — AI Language Learning Platform

A full-stack, AI-powered language learning application featuring adaptive practice drills, immersive roleplay simulations with AI personas, real-time scoring, and a built-in AI tutor — all driven by a custom ReAct agent powered by GPT-4o-mini.

**Live:** [www.agentlanguage.org](https://www.agentlanguage.org)

---

## Features

- 🎯 **Adaptive Drills** — AI generates exercises targeting your weak areas across multiple question types
- 🎭 **Roleplay Simulations** — Practice real conversations with AI personas (grumpy waiter, lost tourist, strict teacher, and more)
- 🤖 **Custom AI Agent** — ReAct-style reasoning loop (no LangChain), uses tools autonomously
- 💬 **AI Tutor** — Per-question multi-turn chat for personalized explanations
- 🏋️ **Coach System** — In-roleplay coaching with politeness scoring, grammar notes, and vocabulary tips
- 📊 **Smart Scoring** — Hybrid deterministic + AI correctness checking with granular feedback
- 🌗 **Dark Mode** — Full light/dark theme support with smooth transitions
- 🎨 **Modern UI** — React 19 + TypeScript + Tailwind CSS with orange-accent design system
- 🔒 **Rate Limiting** — Per-IP sliding-window protection on all AI endpoints
- 🚀 **Production Deployed** — Vercel (frontend) + Railway (backend)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React 19 + Vite + TypeScript)    │
│  Tailwind CSS · Framer Motion · Heroicons   │
└──────────────────┬──────────────────────────┘
                   │ HTTP (axios)
┌──────────────────▼──────────────────────────┐
│  Backend (Python + FastAPI)                  │
│  Rate Limiting · Session Management · CORS   │
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────┐
│  AI Agent (custom ReAct loop)                │
│  4 tools · 5-iteration max · JSON extraction │
└──────────────────┬──────────────────────────┘
                   │ API
┌──────────────────▼──────────────────────────┐
│  OpenAI GPT-4o-mini                          │
└─────────────────────────────────────────────┘
```

---

## Pages

### Home (`/`)
Two-pathway landing page with animated hero section:
- **Drills & Practice** — Enter a topic, pick difficulty, start exercises
- **Roleplay Simulation** — Enter a scenario, get 4 AI-suggested personas (or create custom), start roleplay

### Practice (`/practice`)
Interactive exercise interface supporting three question types:
- **Multiple Choice** — Styled selection cards
- **Banked Cloze** — Fill-in-the-blank with word bank
- **Sentence Reordering** — Tap-to-pick word bubble interface with shuffle

### Feedback (`/feedback`)
Detailed results dashboard:
- Score card with percentage and emoji indicator
- Per-question breakdown with correct/incorrect badges and AI feedback
- **Ask AI Tutor** button per question — opens a multi-turn chat modal (3 turns/question, 15/session)
- Weak areas tags and recommendations
- "Practice Weak Areas" button auto-targets identified gaps

### Roleplay (`/roleplay`)
Full immersive conversation experience:
- Mission briefing modal with role, goal, and scene context
- Chat interface with color-coded bubbles (user/persona/coach/system)
- **Mission Progress** — Animated progress bar with goal tracking
- **Energy System** — Visual turn counter with bolt icons
- **Coach Hints** — Up to 3 per session, with politeness score, grammar notes, vocab tips
- End-of-game overlay with mission status and replay option

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3.4, Framer Motion 12, React Router 7, Axios, Heroicons |
| **Backend** | Python 3.8+, FastAPI, Uvicorn, OpenAI SDK, Pydantic |
| **AI** | GPT-4o-mini, Custom ReAct Agent, 4 tool implementations |
| **Hosting** | Vercel (frontend), Railway (backend) |
| **Domain** | Namecheap DNS → Vercel |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/generate-practice` | Generate 5 AI exercises for a topic/difficulty |
| `POST` | `/api/score-answers` | Score answers with hybrid AI + deterministic checking |
| `POST` | `/api/ask-tutor` | Multi-turn AI tutor Q&A (rate-limited) |
| `POST` | `/api/reset` | Reset agent session state |
| `POST` | `/api/suggest-personas` | AI-generate 4 contextual roleplay personas |
| `POST` | `/api/start-roleplay` | Create a new roleplay session with persona and scene |
| `POST` | `/api/roleplay-message` | Send chat message or request coach hint |
| `POST` | `/api/end-roleplay` | End session and get summary |

### Rate Limits (per IP, sliding window)

| Endpoint | Per Minute | Per Hour |
|----------|-----------|---------|
| Ask Tutor | 10 | 30 |
| Start Roleplay | 5 | 15 |
| Roleplay Message | 12 | 60 |
| Suggest Personas | 5 | 15 |

---

## AI Agent

The backend uses a **custom ReAct-style agent** (no LangChain dependency):

- **Loop:** Up to 5 reasoning iterations per request
- **Format:** Structured `THOUGHT → TOOL → TOOL_INPUT → RESPONSE` blocks
- **JSON extraction:** Robust parser that handles markdown fences, nested objects, and partial responses

### Tools

| Tool | Purpose |
|------|---------|
| `generate_practice` | Creates 5 exercises (multiple choice, banked cloze, sentence reordering) |
| `score_and_analyze` | Scores answers, identifies weak areas, suggests next exercise type |
| `start_roleplay` | Generates roleplay opening scene with persona characterization |
| `roleplay_respond` | Produces in-character dialogue or coach feedback with progress tracking |

---

## Project Structure

```
TalkTutor/
├── backend/
│   ├── main.py              # FastAPI server, routes, rate limiting, session mgmt
│   ├── requirements.txt     # Python dependencies
│   ├── Procfile             # Railway start command
│   └── agent/
│       ├── agent.py         # ReAct reasoning loop (LanguageLearningAgent)
│       ├── tools.py         # 4 tool implementations
│       └── prompts.py       # Agent system prompt template
├── frontend/
│   ├── index.html           # Entry point with dark-mode pre-init script
│   ├── package.json         # Dependencies and scripts
│   ├── tailwind.config.js   # Orange theme, Inter font, dark mode config
│   ├── vite.config.ts       # Vite configuration
│   └── src/
│       ├── App.tsx           # Router, layout, home button, footer
│       ├── api.ts            # Axios API client (9 functions)
│       ├── types.ts          # TypeScript interfaces
│       ├── main.tsx          # React entry point
│       ├── index.css         # Tailwind base styles
│       ├── components/
│       │   └── ThemeToggle.tsx  # Light/dark mode toggle
│       └── pages/
│           ├── Home.tsx      # Landing page with drill + roleplay paths
│           ├── Practice.tsx  # Exercise interface (3 question types)
│           ├── Feedback.tsx  # Score results + AI tutor chat
│           └── Roleplay.tsx  # Immersive conversation with game HUD
├── railway.toml             # Railway build/deploy config
├── docs/                    # Architecture docs and specs
└── .env                     # API keys (gitignored)
```

---

## Setup (Local Development)

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key

### 1. Environment
```bash
cd TalkTutor
cp .env.example .env
# Add your key: OPENAI_API_KEY=sk-...
```

### 2. Backend
```bash
python3 -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
python main.py
```
Runs on **http://localhost:8000**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on **http://localhost:5173**

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Root directory: `frontend`, env: `VITE_API_URL` |
| Backend | Railway | Uses `railway.toml`, env: `OPENAI_API_KEY`, `FRONTEND_URL`, `PORT` |
| Domain | Namecheap | A record → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com` |

---

## License

MIT
