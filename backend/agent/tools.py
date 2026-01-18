"""
Custom tools for the language learning agent.
Each tool has a name, description, and execute function.
"""

from typing import Dict, List, Any
import json


class Tool:
    """Base class for agent tools."""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    def execute(self, **kwargs) -> str:
        """Execute the tool and return results as string."""
        raise NotImplementedError


class GeneratePracticeTool(Tool):
    """Generates practice exercises based on topic and focus areas."""
    
    def __init__(self, llm_client):
        super().__init__(
            name="generate_practice",
            description="Generates practice exercises for language learning. Parameters: topic (str), focus_areas (list, optional), difficulty (str, optional)"
        )
        self.llm = llm_client
    
    def execute(self, topic: str, focus_areas: List[str] = None, difficulty: str = "beginner") -> str:
        """Generate practice exercises using LLM."""
        
        focus_text = ""
        if focus_areas:
            focus_text = f"\nFocus on these weak areas: {', '.join(focus_areas)}"
        
        prompt = f"""Generate 5 practice exercises for learning English in this context: {topic}
Difficulty level: {difficulty}{focus_text}

Create  exercises of:

 Multiple choice questions unless requested otherwise.


Return ONLY a JSON array with this structure:
[
  {{
    "question": "Complete: I'd like to ___ a table for two.",
    "type": "multiple_choice",
    "correct_answer": "reserve",
    "options": ["reserve", "order", "make", "take"]
  }},
  ...
]

This is just an example, generate different exercises.

Keep exercises practical and conversational."""

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return response.choices[0].message.content


class ScoreAndAnalyzeTool(Tool):
    """Scores user answers and identifies weak areas."""
    
    def __init__(self, llm_client):
        super().__init__(
            name="score_and_analyze",
            description="Scores user answers and identifies weak areas. Parameters: exercises (list), answers (list)"
        )
        self.llm = llm_client
    
    def execute(self, exercises: List[Dict], answers: List[str]) -> str:
        """Score answers and analyze weak areas."""
        
        # Format exercises and answers for analysis
        qa_pairs = []
        for i, (exercise, answer) in enumerate(zip(exercises, answers)):
            qa_pairs.append({
                "question": exercise["question"],
                "correct_answer": exercise["correct_answer"],
                "user_answer": answer,
                "type": exercise["type"]
            })
        
        prompt = f"""Analyze these language learning exercises and user answers:

{json.dumps(qa_pairs, indent=2)}

Provide:
1. Score each answer (correct/incorrect)
2. Overall score (X/Y)
3. Identify weak areas and patterns in mistakes
4. Suggest specific focus areas for next practice

Return ONLY a JSON object with this structure:
{{
  "total_score": "3/5",
  "score_percentage": 60,
  "detailed_scores": [
    {{"question_num": 1, "correct": true, "feedback": "Perfect!"}},
    ...
  ],
  "weak_areas": ["ordering drinks", "using polite phrases"],
  "recommendations": "Focus on using 'would like' instead of 'want' for polite requests."
}}
This is just an example, generate different feedback.
"""

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )
        
        return response.choices[0].message.content


# Tool registry
def get_tools(llm_client) -> Dict[str, Tool]:
    """Get all available tools."""
    return {
        "generate_practice": GeneratePracticeTool(llm_client),
        "score_and_analyze": ScoreAndAnalyzeTool(llm_client)
    }
