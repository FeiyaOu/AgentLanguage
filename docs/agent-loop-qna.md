# Q&A: Tool-calling loop behavior

## Question

so actually, if there is only two tools in this project, it may only use one, it depends on the response of the llm, right? it will only use one tool at a time, so every response contains only one tool. after execute the tool, there will be a new request message sent to the llm, to decide whether it needs another tool. the max number of tool calling here is only 5, right? if in the seconde round, the llm gives back a response, the tool calling loop breaks and returns the response, right?

## Answer

Yes — your understanding is basically correct. Let me confirm each point precisely based on the code in [backend/agent/agent.py](backend/agent/agent.py).

- **It depends on the LLM output**:  
  The agent only calls a tool if `_parse_agent_response()` finds a `TOOL:` line in the LLM text. If the LLM outputs `RESPONSE:` instead, no tool is called.

- **Only one tool per LLM message (in this implementation)**:  
  `_parse_agent_response()` extracts only a single `TOOL:` (it uses `re.search`, first match). So each assistant message can trigger **at most one tool call**.

- **Tool → new message → LLM again**:  
  When a tool is called, the code appends a new “user” message like `TOOL_RESULT: ...` and then `continue`s the loop. That causes another LLM call so it can decide “next step” (another tool or final response).

- **Max number of tool-calling rounds is capped by `max_iterations = 5`**:  
  The loop runs at most 5 iterations total.  
  Important detail: this counts *LLM turns*, not strictly “tool calls”.  
  Example: if the LLM returns a final `RESPONSE` on iteration 2, you used 2 LLM calls and maybe only 1 tool call.

- **If on the second round the LLM returns a response, it exits**:  
  Correct. If `parsed["response"]` exists, it immediately `return`s that response, so the loop ends right away.

So the typical pattern is:

1) user message → LLM says `TOOL: generate_practice` → tool runs  
2) tool result added → LLM says `RESPONSE: ...` → function returns

If you want, I can show a concrete fake example of what the `conversation_history` list looks like after each step (it helps make the loop feel “real”).
