"""
Custom implementation of a language learning agent.
This agent can reason, use tools, and adapt based on results.
"""

import json
import os
import re
from typing import Dict, List, Any, Optional
from openai import OpenAI

from agent.prompts import get_agent_prompt
from agent.tools import get_tools, LLM_MODEL


class LanguageLearningAgent:
    """A simple but functional AI agent that uses tools to help with language learning."""
    
    def __init__(self, api_key: str):
        # OPENAI_BASE_URL lets us point at Qianwen's OpenAI-compatible endpoint
        # e.g. https://dashscope.aliyuncs.com/compatible-mode/v1
        self.client = OpenAI(
            api_key=api_key,
            base_url=os.getenv("OPENAI_BASE_URL") or None,
        )
        self.tools = get_tools(self.client)
        self.conversation_history = []
        self.current_exercises = []
        self.last_score_result = None
        self.system_prompt = get_agent_prompt()
        
        # Initialize with system prompt
        self.conversation_history.append({
            "role": "system",
            "content": self.system_prompt
        })
    
    def _parse_agent_response(self, response: str) -> Dict[str, Any]:
        """Parse agent response to extract thought, tool call, or response."""
        
        result = {
            "thought": None,
            "tool": None,
            "tool_input": None,
            "response": None
        }
        
        # Extract THOUGHT
        thought_match = re.search(r'THOUGHT:\s*(.+?)(?=\nTOOL:|RESPONSE:|$)', response, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()
        
        # Extract TOOL
        tool_match = re.search(r'TOOL:\s*(\w+)', response)
        if tool_match:
            result["tool"] = tool_match.group(1).strip()
        
        # Extract TOOL_INPUT
        tool_input_match = re.search(r'TOOL_INPUT:\s*(\{.+?\})', response, re.DOTALL)
        if tool_input_match:
            try:
                result["tool_input"] = json.loads(tool_input_match.group(1).strip())
            except json.JSONDecodeError:
                result["tool_input"] = {}
        
        # Extract RESPONSE
        response_match = re.search(r'RESPONSE:\s*(.+?)$', response, re.DOTALL)
        if response_match:
            result["response"] = response_match.group(1).strip()
        
        return result
    
    def _execute_tool(self, tool_name: str, tool_input: Dict) -> str:
        """Execute a tool and return its result."""
        
        if tool_name not in self.tools:
            return f"Error: Tool '{tool_name}' not found"
        
        tool = self.tools[tool_name]
        
        try:
            result = tool.execute(**tool_input)
            return result
        except Exception as e:
            return f"Error executing tool: {str(e)}"

    def _extract_json(self, text: str) -> Any:
        """Best-effort extraction of JSON from LLM/tool output."""

        if text is None:
            raise ValueError("No text to parse")

        cleaned = str(text).strip()

        # Strip common fenced-code wrappers
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # First try direct parse
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try to extract a JSON array
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start : end + 1]
            return json.loads(candidate)

        # Try to extract a JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start : end + 1]
            return json.loads(candidate)

        raise ValueError("Could not extract valid JSON")
    
    def _get_llm_response(self) -> str:
        """Get response from LLM."""
        
        response = self.client.chat.completions.create(
            model=LLM_MODEL,
            messages=self.conversation_history,
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    def process_user_input(self, user_input: str) -> str:
        """Process user input and return agent's response."""
        
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_input
        })
        
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            # Get agent's response
            agent_response = self._get_llm_response()
            
            # Add to history
            self.conversation_history.append({
                "role": "assistant",
                "content": agent_response
            })
            
            # Parse the response
            parsed = self._parse_agent_response(agent_response)
            
            # If agent wants to use a tool
            if parsed["tool"]:
                tool_result = self._execute_tool(parsed["tool"], parsed["tool_input"] or {})
                
                # Store exercises if generated
                if parsed["tool"] == "generate_practice":
                    try:
                        extracted = self._extract_json(tool_result)
                        if isinstance(extracted, list):
                            self.current_exercises = extracted
                    except Exception:
                        pass
                
                # Store score result if generated
                if parsed["tool"] == "score_and_analyze":
                    try:
                        extracted = self._extract_json(tool_result)
                        if isinstance(extracted, dict):
                            self.last_score_result = extracted
                    except Exception:
                        pass
                
                # Add tool result back to conversation
                self.conversation_history.append({
                    "role": "user",
                    "content": f"TOOL_RESULT: {tool_result}"
                })
                
                # Continue loop to get next action
                continue
            
            # If agent has a response for user
            if parsed["response"]:
                return parsed["response"]
            
            # If we can't parse anything useful, return raw response
            return agent_response

        return "I've reached my thinking limit. Let's start fresh."

    def get_current_exercises(self) -> List[Dict]:
        """Get the current exercises being worked on."""
        return self.current_exercises

    def get_last_score_result(self) -> Optional[Dict]:
        """Get the last score analysis result."""
        return self.last_score_result
    
    def reset(self):
        """Reset the agent state."""
        self.conversation_history = [{
            "role": "system",
            "content": self.system_prompt
        }]
        self.current_exercises = []
        self.last_score_result = None
