"""
FastAPI backend for the Language Learning Agent.
"""

import os
from typing import List, Dict, Any
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
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/score-answers", response_model=ScoreAnswersResponse)
def score_answers(request: ScoreAnswersRequest):
    """Score user answers and identify weak areas."""

    try:
        if not request.exercises:
            raise HTTPException(status_code=400, detail="No exercises provided")
        if len(request.answers) != len(request.exercises):
            raise HTTPException(
                status_code=400,
                detail=f"Answers length ({len(request.answers)}) does not match exercises length ({len(request.exercises)})",
            )

        detailed_scores: List[Dict[str, Any]] = []
        correct_count = 0
        incorrect_types = set()

        for index, (exercise, user_answer) in enumerate(zip(request.exercises, request.answers)):
            expected = str(exercise.get("correct_answer", "")).strip()
            actual = str(user_answer or "").strip()

            is_correct = expected.lower() == actual.lower() if expected else False
            if is_correct:
                correct_count += 1
                feedback = "Correct!"
            else:
                exercise_type = str(exercise.get("type", "")).strip()
                if exercise_type:
                    incorrect_types.add(exercise_type)
                feedback = f"answer: {expected}" if expected else "Incorrect."

            detailed_scores.append(
                {
                    "question_num": index + 1,
                    "correct": is_correct,
                    "feedback": feedback,
                }
            )

        total = len(request.exercises)
        score_percentage = int(round((correct_count / total) * 100)) if total else 0

        weak_areas = sorted(list(incorrect_types))
        if correct_count == total:
            recommendations = "Excellent work — keep practicing to maintain consistency."
        elif weak_areas:
            recommendations = "Review the questions you missed and focus on improving accuracy in these exercise types."
        else:
            recommendations = "Review the questions you missed and try again."

        return {
            "total_score": f"{correct_count}/{total}",
            "score_percentage": score_percentage,
            "detailed_scores": detailed_scores,
            "weak_areas": weak_areas,
            "recommendations": recommendations,
        }

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
