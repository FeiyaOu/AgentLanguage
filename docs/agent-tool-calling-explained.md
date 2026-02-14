# How the TalkTutor Agent Works — Tool Calling Explained

---

## Q1: How does this agent work? In which function defines the tool calling rule?

The core is in `agent.py`'s `process_user_input()` method — it runs a **loop of up to 5 iterations**:

```
User input → LLM responds → Parse → Tool call? → Execute tool → Feed result back → LLM responds again → ... → Final RESPONSE
```

### Where tool calling is defined

There is **no OpenAI function-calling API** being used. Instead, the tool-calling "rule" is defined in two places:

### 1. The system prompt (`prompts.py`)

This tells the LLM to format its output using specific text markers:

```
THOUGHT: [reasoning]
TOOL: [tool_name]
TOOL_INPUT: {"key": "value"}
```

or, when ready to respond to the user:

```
THOUGHT: [reasoning]
RESPONSE: [answer to user]
```

The LLM **chooses** which tool to call (or whether to respond directly) based on these instructions. It's entirely prompt-driven.

### 2. The parser (`_parse_agent_response()`)

This function (in `agent.py` lines 32–65) uses **regex** to extract the structured blocks from the LLM's raw text output:
- Finds `TOOL: generate_practice` → knows to call a tool
- Finds `TOOL_INPUT: {...}` → parses the JSON arguments
- Finds `RESPONSE: ...` → knows the agent is done and wants to reply to the user

### 3. The loop (`process_user_input()`)

The decision flow each iteration (in `agent.py` lines 131–190):
1. Send conversation history to GPT-4o-mini
2. Parse the response with `_parse_agent_response()`
3. **If `parsed["tool"]` exists** → execute that tool via `_execute_tool()`, append the result as `TOOL_RESULT: ...` to the conversation, and **loop again**
4. **If `parsed["response"]` exists** → return it to the user (loop ends)
5. If neither is found → return raw text (fallback)

### In short

The "tool calling rule" isn't a hard-coded if/else — it's the **LLM deciding** based on the system prompt instructions, and the agent loop just **parses and executes** whatever the LLM outputs. This is the classic **ReAct pattern** (Reason + Act) implemented without any framework.

---

## Q2: How does the agent know the tools array? Which function tells the LLM that we have these tools?

The LLM learns about the tools **entirely through the system prompt** — there's no programmatic tool registration with OpenAI's API.

### Step 1: Tools are registered in Python

In `agent.py` line 20:

```python
self.tools = get_tools(self.client)
```

This loads a Python dictionary of tool objects (`generate_practice`, `score_and_analyze`, etc.) — but this is only for the **backend to execute** them.

### Step 2: The LLM is told about tools via plain text

In `prompts.py` lines 7–14:

```
You have access to these tools:
1. generate_practice - Creates practice exercises based on topic and focus areas
2. score_and_analyze - Scores answers and identifies weak areas
3. start_roleplay - Starts an interactive roleplay scenario with a persona
4. roleplay_respond - Generates responses during roleplay sessions
```

This is just a **plain English description** stuffed into the system prompt. The LLM reads it and "knows" it can output `TOOL: generate_practice` or `TOOL: score_and_analyze`.

### The key point

There are **two separate things** happening:

| What | Where | Purpose |
|------|-------|---------|
| Tool **names listed in text** | `prompts.py` (system prompt) | Tells the LLM what tools exist so it can choose one |
| Tool **objects in a dict** | `tools.py` → `get_tools()` | Lets Python actually execute the tool when the LLM picks it |

The connection between them is just **string matching** — when the LLM outputs `TOOL: generate_practice`, the parser extracts `"generate_practice"`, then `_execute_tool()` (in `agent.py` line 67) looks it up in `self.tools["generate_practice"]` and calls `.execute()`.

There's no formal schema or function-calling API. If you added a new tool, you'd need to:
1. Create the tool class in `tools.py`
2. Register it in `get_tools()`
3. **And** add a text description in `prompts.py` so the LLM knows about it
