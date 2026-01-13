# AI Language Learning Agent

A simple AI agent (built from scratch, no LangChain) that helps you learn English through adaptive practice exercises.

## Features

- **Adaptive Learning**: Agent generates exercises based on your topic of interest
- **Intelligent Scoring**: Analyzes your answers and identifies weak areas
- **Targeted Practice**: Re-generates exercises focusing on your weak points
- **Custom Agent**: Built from scratch to understand agent architecture

## Architecture

This is a **custom AI agent** implementation that:
1. **Reasons** about what action to take
2. **Uses tools** (generate_practice, score_and_analyze)
3. **Maintains state** (conversation history, current exercises)
4. **Adapts** based on results (targets weak areas)

### Agent Loop

```
User Input → Agent Reasoning → Tool Selection → Tool Execution → Result Analysis → Response/Next Action
```

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up API key**:
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Run the agent**:
   ```bash
   python main.py
   ```

## Usage Example

```
You: I want to learn restaurant English

Agent: Great! I'll generate some practice exercises for restaurant English...

📝 Practice Exercises:
1. Complete: I'd like to ___ a table for two.
   a) reserve  b) order  c) make  d) take

[... more exercises ...]

Ready to practice? (yes/no): yes

Answer 1: reserve
Answer 2: ...

📊 Score: 4/5 (80%)
Weak areas: ordering drinks, asking for the bill
Let me create targeted exercises for these areas...
```

## Project Structure

```
Agent-LanguageAssistant/
├── agent/
│   ├── agent.py       # Core agent logic (reasoning, tool calling)
│   ├── tools.py       # Custom tools (generate_practice, score_and_analyze)
│   └── prompts.py     # System prompts
├── main.py            # CLI interface
├── requirements.txt   # Dependencies
└── .env.example       # API key template
```

## How It Works

### 1. Agent Core (`agent/agent.py`)
- Maintains conversation history
- Parses agent's reasoning (THOUGHT/TOOL/RESPONSE)
- Executes tools based on decisions
- Manages iteration loop

### 2. Tools (`agent/tools.py`)
- **GeneratePracticeTool**: Creates exercises using LLM
- **ScoreAndAnalyzeTool**: Grades answers and finds weak areas

### 3. Agent Workflow
1. User states learning goal
2. Agent decides to use `generate_practice` tool
3. Tool returns exercises
4. User completes exercises
5. Agent uses `score_and_analyze` tool
6. Based on weak areas, generates targeted practice
7. Loop continues

## Next Steps

- [ ] Add web interface (React frontend)
- [ ] Add more tools (vocabulary lookup, pronunciation)
- [ ] Add database for progress tracking
- [ ] Support multiple languages
- [ ] Add spaced repetition system

## License

MIT
