"""
Custom implementation of a language learning agent.
This agent can reason, use tools, and adapt based on results.
"""

import json
import re
from typing import Dict, List, Any, Optional
from openai import OpenAI

from agent.prompts import get_agent_prompt
from agent.tools import get_tools


class LanguageLearningAgent:
    """A simple but functional AI agent that uses tools to help with language learning."""
    
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.tools = get_tools(self.client)
        self.conversation_history = []
        self.current_exercises = []
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
    
    def _get_llm_response(self) -> str:
        """Get response from LLM."""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
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
                        self.current_exercises = json.loads(tool_result)
                    except:
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
    
    def reset(self):
        """Reset the agent state."""
        self.conversation_history = [{
            "role": "system",
            "content": self.system_prompt
        }]
        self.current_exercises = []
