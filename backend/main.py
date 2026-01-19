"""
FastAPI backend for the Language Learning Agent.
"""

import os
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from agent.agent import LanguageLearningAgent

# Load environment variables
load_dotenv()

app = FastAPI(title="Language Learning Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],  # Vite and common React ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment")

agent = LanguageLearningAgent(api_key)


# Request/Response models
class GeneratePracticeRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    focus_areas: List[str] = []


class Exercise(BaseModel):
    question: str
    type: str
    correct_answer: str
    options: List[str] = []


class GeneratePracticeResponse(BaseModel):
    exercises: List[Exercise]
    message: str


class ScoreAnswersRequest(BaseModel):
    exercises: List[Dict[str, Any]]
    answers: List[str]


class ScoreAnswersResponse(BaseModel):
    total_score: str
    score_percentage: int
    detailed_scores: List[Dict[str, Any]]
    weak_areas: List[str]
    recommendations: str
    suggested_exercise_type: Optional[str] = None


class AskTutorRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None


class AskTutorResponse(BaseModel):
    answer: str


class StartRoleplayRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    persona_type: str = "friendly"


class StartRoleplayResponse(BaseModel):
    roleplay_id: str
    persona_name: str
    persona_type: str
    opening_line: str
    scene_context: str
    user_goal: str


class RoleplayMessageRequest(BaseModel):
    roleplay_id: str
    user_message: str
    turn_count: int


class RoleplayMessageResponse(BaseModel):
    type: str  # "dialogue" or "coach_feedback"
    persona_response: Optional[str] = None
    # Coach feedback fields
    politeness_score: Optional[int] = None
    grammar_notes: Optional[List[str]] = None
    vocab_suggestions: Optional[List[str]] = None
    encouragement: Optional[str] = None
    persona_resume: Optional[str] = None


class EndRoleplayRequest(BaseModel):
    roleplay_id: str


class EndRoleplayResponse(BaseModel):
    final_message: str
    total_turns: int


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Language Learning Agent API"}


@app.post("/api/generate-practice", response_model=GeneratePracticeResponse)
def generate_practice(request: GeneratePracticeRequest):
    """Generate practice exercises based on topic and optional focus areas."""
    
    try:
        # Format the request for the agent
        if request.focus_areas:
            user_input = f"Generate practice exercises for {request.topic} at {request.difficulty} level, focusing on: {', '.join(request.focus_areas)}"
        else:
            user_input = f"I want to learn {request.topic} at {request.difficulty} level"
        
        # Process with agent
        agent.process_user_input(user_input)
        
        # Get generated exercises
        exercises = agent.get_current_exercises()
        
        if not exercises:
            raise HTTPException(status_code=500, detail="Failed to generate exercises")
        
        return {
            "exercises": exercises,
            "message": f"Generated {len(exercises)} practice exercises for {request.topic}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/score-answers", response_model=ScoreAnswersResponse)
def score_answers(request: ScoreAnswersRequest):
    """Score user answers and return rich per-question analysis."""

    try:
        if not request.exercises:
            raise HTTPException(status_code=400, detail="No exercises provided")
        if len(request.answers) != len(request.exercises):
            raise HTTPException(
                status_code=400,
                detail=f"Answers length ({len(request.answers)}) does not match exercises length ({len(request.exercises)})",
            )

        def _norm(text: str) -> str:
            return " ".join(str(text or "").strip().lower().split())

        # Ask the AI tool for richer per-question feedback.
        ai_result: Optional[Dict[str, Any]] = None
        try:
            from agent.tools import ScoreAndAnalyzeTool

            tool = ScoreAndAnalyzeTool(agent.client)
            raw = tool.execute(request.exercises, request.answers)
            extracted = agent._extract_json(raw)  # best-effort JSON extraction
            if isinstance(extracted, dict):
                ai_result = extracted
        except Exception:
            ai_result = None

        # Build a robust merged result that always includes question/user/correct text.
        ai_scores_by_num: Dict[int, Dict[str, Any]] = {}
        if ai_result and isinstance(ai_result.get("detailed_scores"), list):
            for item in ai_result["detailed_scores"]:
                try:
                    qn = int(item.get("question_num"))
                except Exception:
                    continue
                ai_scores_by_num[qn] = item

        detailed_scores: List[Dict[str, Any]] = []
        correct_count = 0
        incorrect_types = set()

        for index, (exercise, user_answer) in enumerate(zip(request.exercises, request.answers)):
            question_num = index + 1
            exercise_type = str(exercise.get("type", "")).strip()
            expected = str(exercise.get("correct_answer", "")).strip()
            question_text = str(exercise.get("question", "")).strip()
            actual = str(user_answer or "").strip()

            ai_item = ai_scores_by_num.get(question_num, {})

            # Hybrid correctness: deterministic for structured types, AI for open-ended.
            if exercise_type in {"multiple_choice", "fill_in_the_blank", "fill_blank"}:
                is_correct = _norm(actual) == _norm(expected) if expected else False
            else:
                is_correct = bool(ai_item.get("correct"))

            if is_correct:
                correct_count += 1
            else:
                if exercise_type:
                    incorrect_types.add(exercise_type)

            feedback = (
                str(ai_item.get("feedback")).strip()
                if ai_item.get("feedback")
                else ("Correct!" if is_correct else (f"Expected: {expected}" if expected else "Incorrect."))
            )

            detailed_scores.append(
                {
                    "question_num": question_num,
                    "question": str(ai_item.get("question") or question_text or "").strip(),
                    "user_answer": str(ai_item.get("user_answer") or actual or "").strip(),
                    "correct_answer": str(ai_item.get("correct_answer") or expected or "").strip(),
                    "correct": is_correct,
                    "feedback": feedback,
                }
            )

        total = len(request.exercises)
        score_percentage = int(round((correct_count / total) * 100)) if total else 0

        weak_areas = (
            ai_result.get("weak_areas")
            if ai_result and isinstance(ai_result.get("weak_areas"), list)
            else sorted(list(incorrect_types))
        )
        suggested_exercise_type = (
            str(ai_result.get("suggested_exercise_type")).strip()
            if ai_result and ai_result.get("suggested_exercise_type")
            else (weak_areas[0] if weak_areas else None)
        )

        recommendations = (
            str(ai_result.get("recommendations")).strip()
            if ai_result and ai_result.get("recommendations")
            else (
                "Excellent work — keep practicing to maintain consistency."
                if correct_count == total
                else "Review the questions you missed and try again."
            )
        )

        return {
            "total_score": f"{correct_count}/{total}",
            "score_percentage": score_percentage,
            "detailed_scores": detailed_scores,
            "weak_areas": weak_areas,
            "recommendations": recommendations,
            "suggested_exercise_type": suggested_exercise_type,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask-tutor", response_model=AskTutorResponse)
def ask_tutor(request: AskTutorRequest):
    """Ask the AI tutor a question about specific context."""
    try:
        context_str = ""
        if request.context:
            context_str = f"\nContext: {json.dumps(request.context)}"
        
        user_input = f"User asks a follow-up question: {request.question}{context_str}"
        
        # Use simple RESPONSE from agent
        response = agent.process_user_input(user_input)
        
        return {"answer": response}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reset")
def reset_session():
    """Reset the agent session."""
    try:
        agent.reset()
        return {"status": "ok", "message": "Session reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Roleplay session storage (in-memory for simplicity)
roleplay_sessions: Dict[str, Dict[str, Any]] = {}


@app.post("/api/start-roleplay", response_model=StartRoleplayResponse)
def start_roleplay(request: StartRoleplayRequest):
    """Start a new interactive roleplay session."""
    try:
        import uuid
        from agent.tools import RoleplayTool
        
        # Generate unique roleplay ID
        roleplay_id = str(uuid.uuid4())
        
        # Use tool to generate opening
        tool = RoleplayTool(agent.client)
        raw = tool.execute(
            scenario=request.topic,
            persona_type=request.persona_type,
            difficulty=request.difficulty
        )
        
        # Extract JSON
        result = agent._extract_json(raw)
        
        # Store session
        roleplay_sessions[roleplay_id] = {
            "topic": request.topic,
            "difficulty": request.difficulty,
            "persona_type": request.persona_type,
            "persona_name": result.get("persona_name", "AI Character"),
            "conversation_history": [],
            "turn_count": 0,
            "scene_context": result.get("scene_context", "")
        }
        
        return {
            "roleplay_id": roleplay_id,
            "persona_name": result.get("persona_name", "AI Character"),
            "persona_type": request.persona_type,
            "opening_line": result.get("opening_line", "Hello! Let's practice."),
            "scene_context": result.get("scene_context", f"Practicing {request.topic}"),
            "user_goal": result.get("user_goal", f"Practice your {request.topic} skills")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/roleplay-message", response_model=RoleplayMessageResponse)
def roleplay_message(request: RoleplayMessageRequest):
    """Send a message in an active roleplay session."""
    try:
        from agent.tools import RoleplayResponseTool
        
        # Get session
        session = roleplay_sessions.get(request.roleplay_id)
        if not session:
            raise HTTPException(status_code=404, detail="Roleplay session not found")
        
        # Add user message to history
        session["conversation_history"].append({
            "role": "user",
            "message": request.user_message
        })
        
        # Generate response
        tool = RoleplayResponseTool(agent.client)
        raw = tool.execute(
            persona_type=session["persona_type"],
            persona_name=session["persona_name"],
            conversation_history=session["conversation_history"],
            user_message=request.user_message,
            turn_count=request.turn_count,
            scenario=session["topic"]
        )
        
        result = agent._extract_json(raw)
        
        response_type = result.get("type", "dialogue")
        
        if response_type == "coach_feedback":
            # Add coach feedback to history
            session["conversation_history"].append({
                "role": "coach",
                "message": f"Coach Feedback at turn {request.turn_count}"
            })
            
            # Add persona resume to history
            if result.get("persona_resume"):
                session["conversation_history"].append({
                    "role": "persona",
                    "message": result.get("persona_resume")
                })
            
            return RoleplayMessageResponse(
                type="coach_feedback",
                politeness_score=result.get("politeness_score", 75),
                grammar_notes=result.get("grammar_notes", []),
                vocab_suggestions=result.get("vocab_suggestions", []),
                encouragement=result.get("encouragement", "Keep going!"),
                persona_resume=result.get("persona_resume", "")
            )
        else:
            # Regular dialogue
            persona_response = result.get("persona_response", "...")
            
            session["conversation_history"].append({
                "role": "persona",
                "message": persona_response
            })
            
            return RoleplayMessageResponse(
                type="dialogue",
                persona_response=persona_response
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/end-roleplay", response_model=EndRoleplayResponse)
def end_roleplay(request: EndRoleplayRequest):
    """End a roleplay session and provide summary."""
    try:
        session = roleplay_sessions.get(request.roleplay_id)
        if not session:
            raise HTTPException(status_code=404, detail="Roleplay session not found")
        
        total_turns = len([msg for msg in session["conversation_history"] if msg["role"] == "user"])
        
        # Clean up session
        del roleplay_sessions[request.roleplay_id]
        
        return {
            "final_message": f"Great job! You completed {total_turns} turns of conversation practice.",
            "total_turns": total_turns
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
