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

IMPORTANT CONSTRAINTS:
- Do NOT require any free typing from the learner.
- Every exercise must be answerable via selection or reordering.

Supported exercise types (ONLY these):
1. "multiple_choice": Standard 4-option single-answer questions.
2. "banked_cloze": A sentence with a single blank ("___") + options bank. User selects the best option.
3. "sentence_reordering": Provide shuffled word tokens as bubbles; user taps to reorder into a correct sentence.

Return ONLY a JSON array of 5 exercises. No markdown, no explanation.

Schemas:

Multiple Choice:
{{
    "question": string,
    "type": "multiple_choice",
    "correct_answer": string,
    "options": [string, string, string, string]
}}

Banked Cloze:
{{
    "question": "The apple ___ red.",
    "type": "banked_cloze",
    "correct_answer": "is",
    "options": ["are", "is", "am", "be"]
}}

Sentence Reordering:
{{
    "question": "Reorder the words to form a correct sentence.",
    "type": "sentence_reordering",
    "correct_answer": "I drink coffee in the morning.",
    "tokens": ["morning", "drink", "I", "coffee", "in", "the"]
}}

Guidelines:
- Keep options plausible (especially for grammar: tense, subject-verb agreement, articles, prepositions).
- Keep sentences short and conversational.
- For "sentence_reordering", tokens MUST be intentionally shuffled (not already in the correct order).
"""

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
5. Suggest the best type of exercise for improvement from: "multiple_choice", "banked_cloze", "sentence_reordering".

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
    "suggested_exercise_type": "banked_cloze"
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
            temperature=0.8,
            max_tokens=300,
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
        scenario: str,
        scene_context: str = "",
        user_goal: str = "",
        turns_remaining: int = 0,
        mode: str = "chat",
    ) -> str:
        """Generate persona response or coach feedback."""

        mode = (mode or "chat").strip().lower()

        if mode == "hint":
            # Generate coach feedback
            recent_turns = conversation_history[-6:] if len(conversation_history) >= 6 else conversation_history

            def _turn_text(turn: Dict[str, Any]) -> str:
                return str(
                    turn.get("message")
                    or turn.get("content")
                    or turn.get("text")
                    or ""
                ).strip()

            def _speaker(turn: Dict[str, Any]) -> str:
                role = str(turn.get("role") or "").strip().lower()
                if role == "user":
                    return "User"
                if role == "coach":
                    return "Coach"
                return persona_name

            # Format conversation for better analysis
            conversation_text = "\n".join(
                [f"{_speaker(turn)}: {_turn_text(turn)}" for turn in recent_turns]
            )
            
            prompt = f"""You are an expert English coach helping a student complete a roleplay mission.

SCENARIO: {scenario}
SCENE CONTEXT: {scene_context}
USER GOAL (Mission): {user_goal}
TURNS REMAINING: {turns_remaining}
STUDENT'S CONVERSATION PARTNER: {persona_name}

RECENT CONVERSATION TO ANALYZE:
{conversation_text}

YOUR TASK:
1) Give the student a concise hint for the NEXT best move toward the USER GOAL.
2) Estimate progress toward the goal (0-100).

IMPORTANT UX RULES:
- Be brief and concrete.
- If the student is off-topic, clearly redirect them.
- Do NOT continue the roleplay as {persona_name}.

ANALYSIS REQUIREMENTS:

1. POLITENESS SCORE (0-100):
   - Score based on how polite and appropriate the student's language is
   - Consider: use of please/thank you, formal vs informal register, directness
   - 90-100: Excellent, very polite
   - 70-89: Good, mostly polite
   - 50-69: Needs improvement
   - Below 50: Impolite or inappropriate

2. GRAMMAR NOTES:
   - List SPECIFIC grammar mistakes the student made
   - For each mistake, show what they said and how to correct it
   - If no mistakes, say "No grammar issues detected - great job!"
   - Examples: subject-verb agreement, tense errors, article usage, word order

3. VOCABULARY SUGGESTIONS:
   - Suggest better or more natural word choices
   - Recommend useful phrases for this scenario
   - Point out any awkward or unnatural expressions
   - If vocabulary was good, suggest advanced alternatives

4. ENCOURAGEMENT:
   - Give specific positive feedback about what they did well
   - Motivate them to continue practicing

5. PERSONA RESUME:
   - Write a brief line as {persona_name} to continue the conversation naturally

Return ONLY a valid JSON object with these exact fields:
{{
  "type": "coach_feedback",
  "politeness_score": <number 0-100 based on your analysis>,
  "grammar_notes": [<list of specific grammar corrections or "No grammar issues detected - great job!">],
  "vocab_suggestions": [<list of vocabulary improvements or useful phrases>],
    "encouragement": "<a short hint that moves them toward the goal>",
    "persona_resume": "",
    "goal_progress": <number 0-100 estimating how close the student is to the goal>,
    "goal_status": "in_progress" | "off_track" | "achieved",
    "achieved": <true if the goal is achieved, else false>
}}

IMPORTANT: Generate REAL feedback based on what the student actually said. Do NOT use example values."""
        else:
            # Generate in-character response
            persona_traits = {
                "grumpy_waiter": "impatient, easily annoyed, but fair if treated with respect",
                "lost_tourist": "confused, anxious, speaks broken English",
                "strict_teacher": "demanding, corrects grammar mistakes",
                "friendly": "warm, patient, encouraging"
            }.get(persona_type, "friendly and helpful")
            
            prompt = f"""You are {persona_name}, a character in a language learning roleplay game.
Your traits: {persona_traits}
Scenario: {scenario}
Scene context: {scene_context}
User mission goal: {user_goal}
Turns remaining: {turns_remaining}

Recent conversation:
{json.dumps(conversation_history[-8:], indent=2)}

User just said: "{user_message}"

Respond in character. Keep it natural and conversational (1-3 sentences).

Also estimate progress toward the user's mission goal.

Return ONLY a JSON object:
{{
  "type": "dialogue",
    "persona_response": "Your in-character response here",
    "goal_progress": <number 0-100 estimating mission progress>,
    "goal_status": "in_progress" | "off_track" | "achieved",
    "achieved": <true if the goal is achieved, else false>
}}"""
        
        # Choose max_tokens based on mode
        _max_tokens = 400 if mode == "hint" else 250

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=_max_tokens,
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
