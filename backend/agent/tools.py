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

Supported exercise types:
1. "multiple_choice": Standard 4-option questions.
2. "fill_in_the_blank": User types the missing word/phrase.
3. "roleplay": User responses to a scenario (open-ended).

Decide the best exercise type based on the request. If "roleplay" or "open formatted" is suggested in the focus areas, use "roleplay". Default to "multiple_choice".

Return ONLY a JSON array with the chosen structure.

Example (Multiple Choice):
[
  {{
    "question": "Complete: I'd like to ___ a table for two.",
    "type": "multiple_choice",
    "correct_answer": "reserve",
    "options": ["reserve", "order", "make", "take"]
  }}
]

Example (Fill in blank):
[
  {{
    "question": "Type the missing word: I am ___ forward to meeting you.",
    "type": "fill_in_the_blank",
    "correct_answer": "looking"
  }}
]

Example (Roleplay):
[
  {{
    "question": "You are at a cafe. The waiter asks 'What can I get you?'. You want a black coffee. Write your response:",
    "type": "roleplay",
    "correct_answer": "I'd like a black coffee, please." 
  }}
]

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
5. Suggest the best type of exercise for improvement (e.g. roleplay, drill, explanation, conversation)

Return ONLY a JSON object with this structure:
{{
  "total_score": "3/5",
  "score_percentage": 60,
  "detailed_scores": [
    {{
      "question_num": 1,
      "question": "The original question text",
      "user_answer": "The user's answer",
      "correct_answer": "The expected answer",
      "correct": true,
      "feedback": "Perfect! precise usage."
    }},
    ...
  ],
  "weak_areas": ["ordering drinks", "using polite phrases"],
  "recommendations": "Focus on using 'would like' instead of 'want' for polite requests.",
  "suggested_exercise_type": "roleplay"
}}
This is just an example, generate different feedback.
"""

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )
        
        return response.choices[0].message.content


class RoleplayTool(Tool):
    """Starts an interactive roleplay scenario with a persona."""
    
    def __init__(self, llm_client):
        super().__init__(
            name="start_roleplay",
            description="Starts an interactive roleplay scenario. Parameters: scenario (str), persona_type (str), difficulty (str, optional)"
        )
        self.llm = llm_client
    
    def execute(self, scenario: str, persona_type: str = "friendly", difficulty: str = "beginner", custom_description: str = None) -> str:
        """Generate roleplay opening scene with persona."""
        
        persona_configs = {
            "grumpy_waiter": {
                "name": "Marco the Grumpy Waiter",
                "traits": "impatient, easily annoyed, but secretly fair if treated with respect"
            },
            "lost_tourist": {
                "name": "Sophie the Lost Tourist",
                "traits": "confused, anxious, speaks broken English, very grateful for help"
            },
            "strict_teacher": {
                "name": "Ms. Chen the Strict Teacher",
                "traits": "demanding, corrects mistakes immediately, expects proper grammar"
            },
            "friendly": {
                "name": "Alex the Friendly Local",
                "traits": "warm, patient, helpful, encourages you"
            }
        }
        
        # Handle custom persona
        if persona_type == "custom" and custom_description:
            persona_config = {
                "name": "Custom Character",
                "traits": custom_description
            }
            custom_prompt_addition = f"\nCreate a unique name for this character based on their description."
        else:
            persona_config = persona_configs.get(persona_type, persona_configs["friendly"])
            custom_prompt_addition = ""
        
        prompt = f"""Create an opening scene for a language learning roleplay scenario.

Scenario: {scenario}
Difficulty: {difficulty}
Persona: {persona_config["name"]}
Traits: {persona_config["traits"]}{custom_prompt_addition}

You are playing the role of this character. Set the scene and speak your first line in character.

The user's goal is to successfully navigate this conversation (e.g., order food, ask for directions, etc.).

Return ONLY a JSON object:
{{
  "persona_name": "Character's name",
  "persona_type": "{persona_type}",
  "opening_line": "Your first in-character line",
  "scene_context": "Brief description of the setting",
  "user_goal": "What the user should try to accomplish"
}}

Make it engaging and realistic!"""

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        
        return response.choices[0].message.content


class RoleplayResponseTool(Tool):
    """Generates in-character responses or coach feedback during roleplay."""
    
    def __init__(self, llm_client):
        super().__init__(
            name="roleplay_respond",
            description="Responds to user in roleplay. Parameters: persona_type (str), persona_name (str), conversation_history (list), user_message (str), turn_count (int), scenario (str)"
        )
        self.llm = llm_client
    
    def execute(
        self,
        persona_type: str,
        persona_name: str,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        turn_count: int,
        scenario: str
    ) -> str:
        """Generate persona response or coach feedback."""
        
        is_coach_turn = turn_count > 0 and turn_count % 3 == 0
        
        if is_coach_turn:
            # Generate coach feedback
            recent_turns = conversation_history[-6:] if len(conversation_history) >= 6 else conversation_history
            
            prompt = f"""You are an English language coach. Review the user's last few messages in this roleplay scenario.

Scenario: {scenario}
Recent conversation:
{json.dumps(recent_turns, indent=2)}

Analyze the user's performance on:
1. Politeness (0-100 score)
2. Grammar errors (list specific mistakes)
3. Vocabulary usage (suggest better words or phrases)

Then, briefly resume the roleplay as {persona_name} with encouragement.

Return ONLY a JSON object:
{{
  "type": "coach_feedback",
  "politeness_score": 85,
  "grammar_notes": ["Consider using 'I would like' instead of 'I want'"],
  "vocab_suggestions": ["Try 'Could you possibly...' for more polite requests"],
  "encouragement": "Great progress! Let's continue...",
  "persona_resume": "{persona_name}'s brief in-character line to continue the scene"
}}"""
        else:
            # Generate in-character response
            persona_traits = {
                "grumpy_waiter": "impatient, easily annoyed, but fair if treated with respect",
                "lost_tourist": "confused, anxious, speaks broken English",
                "strict_teacher": "demanding, corrects grammar mistakes",
                "friendly": "warm, patient, encouraging"
            }.get(persona_type, "friendly and helpful")
            
            prompt = f"""You are {persona_name}, a character in a language learning roleplay.
Your traits: {persona_traits}
Scenario: {scenario}

Conversation so far:
{json.dumps(conversation_history, indent=2)}

User just said: "{user_message}"

Respond in character. Keep it natural and conversational (1-3 sentences).

Return ONLY a JSON object:
{{
  "type": "dialogue",
  "persona_response": "Your in-character response here"
}}"""
        
        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return response.choices[0].message.content


# Tool registry
def get_tools(llm_client) -> Dict[str, Tool]:
    """Get all available tools."""
    return {
        "generate_practice": GeneratePracticeTool(llm_client),
        "score_and_analyze": ScoreAndAnalyzeTool(llm_client),
        "start_roleplay": RoleplayTool(llm_client),
        "roleplay_respond": RoleplayResponseTool(llm_client)
    }
