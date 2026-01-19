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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
