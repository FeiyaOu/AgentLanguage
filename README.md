# AI Language Learning Agent - Full Stack

A modern AI-powered language learning application with adaptive practice exercises.

## Features

- 🎯 **Adaptive Learning** - AI targets your weak areas
- 🤖 **Smart Agent** - Custom built (no LangChain), uses tools autonomously  
- �� **Modern UI** - React + TypeScript + Tailwind CSS with light orange theme
- 📊 **Real-time Feedback** - Instant scoring and recommendations
- 🔄 **Progressive Practice** - Each session builds on previous results

## Architecture

```
Frontend (React + Vite + TypeScript + Tailwind)
    ↓ HTTP (axios)
Backend (Python + FastAPI)
    ↓ calls
AI Agent (custom implementation)
    ↓ uses
OpenAI API (GPT-4o-mini)
```

## Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key

### 1. Environment Setup
```bash
cd Agent-LanguageAssistant
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
```

### 2. Backend Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Start server
python main.py
```
Backend runs on **http://localhost:8000**

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend
npm install  # If not done already
npm run dev
```
Frontend runs on **http://localhost:5173**

## Usage

1. Open **http://localhost:5173**
2. Enter a topic (e.g., "restaurant English")
3. Select difficulty level
4. Complete exercises
5. Get feedback with identified weak areas
6. Continue with targeted practice

## Project Structure

```
Agent-LanguageAssistant/
├── backend/
│   ├── agent/           # AI agent implementation
│   │   ├── agent.py     # Core reasoning loop
│   │   ├── tools.py     # generate_practice, score_and_analyze
│   │   └── prompts.py   # System prompts
│   ├── main.py          # FastAPI server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       # Home, Practice, Feedback
│   │   ├── api.ts       # Backend API client
│   │   ├── types.ts     # TypeScript types
│   │   └── index.css    # Tailwind styles
│   ├── tailwind.config.js
│   └── package.json
└── .env                 # API keys (gitignored)
```

## API Endpoints

**POST /api/generate-practice** - Generate exercises
**POST /api/score-answers** - Score and analyze
**POST /api/reset** - Reset session

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind, React Router, Axios  
**Backend:** Python, FastAPI, OpenAI SDK, Custom Agent

## License
MIT
