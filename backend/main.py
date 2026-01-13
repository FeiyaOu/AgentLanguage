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
        import json
        
        # Format answers for agent
        answer_text = f"Here are my answers: {json.dumps(request.answers)}"
        
        # Process with agent
        response = agent.process_user_input(answer_text)
        
        # Parse the response (it should contain JSON from the tool)
        # Extract JSON from the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            # Fallback simple scoring
            return {
                "total_score": f"{len(request.answers)}//{len(request.exercises)}",
                "score_percentage": 70,
                "detailed_scores": [],
                "weak_areas": ["Review needed"],
                "recommendations": response
            }
    
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
