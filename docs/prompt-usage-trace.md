# Q&A: Where `prompts.py` is used + full request→tool→response loop

## Question

point out exactly where it’s used in your backend (the import + call site) and explain the full request → tool call → response loop in your codebase.

## Answer

**Where your prompt is used (import + call site)**
- The prompt is defined in [backend/agent/prompts.py](backend/agent/prompts.py#L5) and returned by `get_agent_prompt()` in [backend/agent/prompts.py](backend/agent/prompts.py#L35).
- It’s imported in the agent class here: [backend/agent/agent.py](backend/agent/agent.py#L11).
- It’s called and stored on the agent instance here: [backend/agent/agent.py](backend/agent/agent.py#L23).
- Then it’s inserted into the conversation as the very first “system” message here: [backend/agent/agent.py](backend/agent/agent.py#L27-L28).

So: `get_agent_prompt()` → `self.system_prompt` → added to `self.conversation_history` as a system message.

**The full flow: request → tool call → response (end-to-end)**
1) **A user request enters the backend**
- FastAPI creates a single `agent = LanguageLearningAgent(api_key)` at startup: [backend/main.py](backend/main.py#L42).
- When the frontend hits “generate practice”, the API formats a plain-English user message and calls `agent.process_user_input(...)`: [backend/main.py](backend/main.py#L95).
- Then it reads the generated exercises from agent state: [backend/main.py](backend/main.py#L98).

2) **`process_user_input()` runs the agent loop**
- The main loop lives in `LanguageLearningAgent.process_user_input`: [backend/agent/agent.py](backend/agent/agent.py#L128).
- It sends the current `conversation_history` (system + user + assistant messages) to the model: `_get_llm_response()` in [backend/agent/agent.py](backend/agent/agent.py#L116).

3) **The model’s text is parsed into either a tool call or a user response**
- The parsing logic is `_parse_agent_response()` in [backend/agent/agent.py](backend/agent/agent.py#L31).
- It uses regex to look for the exact labels your system prompt demands:
  - `THOUGHT: ...`
  - `TOOL: ...`
  - `TOOL_INPUT: {...}`
  - `RESPONSE: ...`

4) **If the model asks for a tool, the backend executes it**
- Tool execution happens here: `_execute_tool()` in [backend/agent/agent.py](backend/agent/agent.py#L66).
- The available tools are registered by `get_tools()` in [backend/agent/tools.py](backend/agent/tools.py#L124) and include:
  - `generate_practice`: [backend/agent/tools.py](backend/agent/tools.py#L22)
  - `score_and_analyze`: [backend/agent/tools.py](backend/agent/tools.py#L69)
  - mapping names → implementations: [backend/agent/tools.py](backend/agent/tools.py#L127-L128)

5) **Tool results are fed back into the conversation**
- After running a tool, the agent appends a new “user” message containing `TOOL_RESULT: ...` so the model can see what happened and decide the next step: [backend/agent/agent.py](backend/agent/agent.py#L172).
- Then the loop continues, so the model can either:
  - call another tool, or
  - finally produce `RESPONSE: ...` for the user.

6) **Where exercises are stored**
- When the tool is `generate_practice`, the agent tries to parse the tool output as JSON and stores it in `self.current_exercises`: [backend/agent/agent.py](backend/agent/agent.py#L162).
- The API/CLI later fetches them with `get_current_exercises()`.

**How scoring works in your setup**
- The “score answers” endpoint sends only answers text to the agent: [backend/main.py](backend/main.py#L123).
- The reason this can still work: the model has access to earlier `TOOL_RESULT: ...` messages that contained the generated exercises, so it can call `score_and_analyze` with both `exercises` and `answers` (as long as it follows your system-prompt format).
- The endpoint then tries to extract JSON from whatever text the agent returns.

If you want, I can also trace the same flow through the CLI version (it uses the same `LanguageLearningAgent`): [backend/cli.py](backend/cli.py#L65), [backend/cli.py](backend/cli.py#L84), [backend/cli.py](backend/cli.py#L106).
