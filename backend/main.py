"""
FastAPI backend for the Language Learning Agent.
"""

import os
import json
import re
import time
from collections import defaultdict
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
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
    ] + [
        origin for origin in [os.getenv("FRONTEND_URL")]
        if origin
    ],  # Vite dev ports + deployed frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment")

agent = LanguageLearningAgent(api_key)


# ---------------------------------------------------------------------------
# Per-IP sliding-window rate limiter (in-memory, no external dependencies)
# ---------------------------------------------------------------------------
class RateLimiter:
    """Simple in-memory sliding-window rate limiter keyed by client IP."""

    def __init__(self, per_minute: int = 10, per_hour: int = 30):
        self.per_minute = per_minute
        self.per_hour = per_hour
        # {ip: [timestamp, …]}
        self._hits: Dict[str, list] = defaultdict(list)

    def _prune(self, ip: str) -> None:
        """Remove timestamps older than 1 hour."""
        cutoff = time.time() - 3600
        self._hits[ip] = [t for t in self._hits[ip] if t > cutoff]

    def check(self, ip: str) -> Optional[str]:
        """Return an error message if rate limit exceeded, else None."""
        now = time.time()
        self._prune(ip)
        timestamps = self._hits[ip]

        recent_minute = [t for t in timestamps if t > now - 60]
        if len(recent_minute) >= self.per_minute:
            return f"Rate limit exceeded — max {self.per_minute} requests per minute. Please wait a moment."

        if len(timestamps) >= self.per_hour:
            return f"Rate limit exceeded — max {self.per_hour} requests per hour. Take a break and come back soon!"

        return None

    def record(self, ip: str) -> None:
        """Record a hit for the given IP."""
        self._hits[ip].append(time.time())


tutor_limiter = RateLimiter(per_minute=10, per_hour=30)
roleplay_start_limiter = RateLimiter(per_minute=5, per_hour=15)
roleplay_msg_limiter = RateLimiter(per_minute=12, per_hour=60)
persona_suggest_limiter = RateLimiter(per_minute=5, per_hour=15)

# ---------------------------------------------------------------------------
# Concurrent session tracker & session garbage collection
# ---------------------------------------------------------------------------
MAX_SESSIONS_PER_IP = 2
MAX_HINTS_PER_SESSION = 3
SESSION_TTL_SECONDS = 30 * 60  # 30 minutes
MAX_ROLEPLAY_MSG_WORDS = 100

# {ip: set(roleplay_id, …)}
_ip_sessions: Dict[str, set] = defaultdict(set)


def _gc_expired_sessions() -> None:
    """Lazy garbage-collection: remove sessions idle for > SESSION_TTL_SECONDS."""
    now = time.time()
    expired_ids = [
        rid for rid, sess in roleplay_sessions.items()
        if now - sess.get("last_active", 0) > SESSION_TTL_SECONDS
    ]
    for rid in expired_ids:
        sess = roleplay_sessions.pop(rid, None)
        if sess:
            ip = sess.get("client_ip", "")
            _ip_sessions.get(ip, set()).discard(rid)


def _get_client_ip(req: Request) -> str:
    return req.client.host if req.client else "unknown"


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
    tokens: List[str] = []


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


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class AskTutorRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None
    history: List[ChatMessage] = []  # previous turns for multi-turn chat


class AskTutorResponse(BaseModel):
    answer: str


class SuggestPersonasRequest(BaseModel):
    scenario: str
    difficulty: str = "beginner"


class SuggestedPersona(BaseModel):
    id: str
    emoji: str
    name: str
    traits: str


class SuggestPersonasResponse(BaseModel):
    personas: List[SuggestedPersona]


class StartRoleplayRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    persona_type: str = "friendly"
    custom_description: Optional[str] = None


class StartRoleplayResponse(BaseModel):
    roleplay_id: str
    persona_name: str
    persona_type: str
    opening_line: str
    scene_context: str
    user_goal: str
    max_turns: int


class RoleplayMessageRequest(BaseModel):
    roleplay_id: str
    user_message: str
    turn_count: int
    mode: Optional[str] = None  # "chat" (default) or "hint"
    consume_turn: Optional[bool] = None


class RoleplayMessageResponse(BaseModel):
    type: str  # "dialogue", "coach_feedback", or "session_end"
    persona_response: Optional[str] = None
    # Goal / game state
    goal_progress: Optional[int] = None  # 0-100
    goal_status: Optional[str] = None  # in_progress | off_track | achieved
    achieved: Optional[bool] = None
    turns_remaining: Optional[int] = None
    session_over: Optional[bool] = None
    final_message: Optional[str] = None
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

        def _norm_sentence(text: str) -> str:
            cleaned = _norm(text)
            cleaned = re.sub(r"[^\w\s']+", "", cleaned)
            return " ".join(cleaned.split())

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

            # Hybrid correctness: deterministic for structured (no free-typing) types, AI for open-ended.
            if exercise_type in {"multiple_choice", "banked_cloze", "sentence_reordering"}:
                if exercise_type == "sentence_reordering":
                    is_correct = _norm_sentence(actual) == _norm_sentence(expected) if expected else False
                else:
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
def ask_tutor(request: AskTutorRequest, req: Request):
    """Ask the AI tutor a question, with multi-turn history and rate limiting."""

    # --- Rate limiting (per IP) ---
    client_ip = req.client.host if req.client else "unknown"
    error_msg = tutor_limiter.check(client_ip)
    if error_msg:
        raise HTTPException(status_code=429, detail=error_msg)

    # --- Word-count validation (server-side) ---
    word_count = len(request.question.split())
    if word_count > 50:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long ({word_count} words). Please keep it under 50 words.",
        )

    try:
        # Build the system message with question context
        system_content = (
            "You are a friendly, encouraging English-language tutor. "
            "Answer the student's question clearly and concisely. "
            "Use simple examples when helpful. Keep answers under 50 words."
        )
        if request.context:
            system_content += (
                f"\n\nThe student is asking about this exercise:\n"
                f"Question: {request.context.get('question', 'N/A')}\n"
                f"Student's answer: {request.context.get('user_answer', 'N/A')}\n"
                f"Correct answer: {request.context.get('correct_answer', 'N/A')}\n"
                f"Feedback: {request.context.get('feedback', 'N/A')}"
            )

        messages: List[Dict[str, str]] = [{"role": "system", "content": system_content}]

        # Append conversation history (capped at last 10 messages for safety)
        for msg in request.history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        # Append the current question
        messages.append({"role": "user", "content": request.question})

        # Call OpenAI directly (bypass agent tool loop — tutor is a simple Q&A)
        completion = agent.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=100,
            temperature=0.7,
        )

        answer = completion.choices[0].message.content.strip()

        # Record the hit only on success
        tutor_limiter.record(client_ip)

        return {"answer": answer}

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


@app.post("/api/suggest-personas", response_model=SuggestPersonasResponse)
def suggest_personas(request: SuggestPersonasRequest, req: Request):
    """Suggest 3-4 contextually appropriate personas for a given scenario."""
    # Rate limit
    client_ip = _get_client_ip(req)
    err = persona_suggest_limiter.check(client_ip)
    if err:
        raise HTTPException(status_code=429, detail=err)

    try:
        prompt = f"""Given this English-learning roleplay scenario: "{request.scenario}"
Difficulty level: {request.difficulty}

Generate exactly 4 conversation-partner personas that would naturally appear in this scenario.
Each persona should have a distinct personality that creates a different conversational challenge.

Return ONLY a JSON array with this structure:
[
  {{
    "id": "unique_snake_case_id",
    "emoji": "a single emoji that represents this character",
    "name": "Character Name (e.g. Marco the Waiter)",
    "traits": "Brief personality description, 8-15 words"
  }}
]

Rules:
- Every persona MUST make sense for the scenario "{request.scenario}"
- Vary the difficulty: one easy/friendly, one moderate, one challenging
- Use creative but realistic character names
- The 4th persona can be more unusual or humorous
- traits should hint at how they'll behave in conversation"""

        response = agent.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=300,
        )

        raw = response.choices[0].message.content
        personas = agent._extract_json(raw)

        if not isinstance(personas, list) or len(personas) == 0:
            raise HTTPException(status_code=500, detail="Failed to generate personas")

        # Ensure each persona has required fields
        result = []
        for p in personas[:4]:
            result.append(SuggestedPersona(
                id=str(p.get("id", "persona")),
                emoji=str(p.get("emoji", "🎭")),
                name=str(p.get("name", "AI Character")),
                traits=str(p.get("traits", "friendly and helpful")),
            ))

        persona_suggest_limiter.record(client_ip)
        return {"personas": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/start-roleplay", response_model=StartRoleplayResponse)
def start_roleplay(request: StartRoleplayRequest, req: Request):
    """Start a new interactive roleplay session."""
    # Rate limit
    client_ip = _get_client_ip(req)
    err = roleplay_start_limiter.check(client_ip)
    if err:
        raise HTTPException(status_code=429, detail=err)

    # GC expired sessions first
    _gc_expired_sessions()

    # Concurrent session cap
    active_for_ip = _ip_sessions.get(client_ip, set())
    # Prune stale references
    active_for_ip = {rid for rid in active_for_ip if rid in roleplay_sessions}
    _ip_sessions[client_ip] = active_for_ip
    if len(active_for_ip) >= MAX_SESSIONS_PER_IP:
        raise HTTPException(
            status_code=429,
            detail=f"Too many active sessions (max {MAX_SESSIONS_PER_IP}). End an existing session first.",
        )

    try:
        import uuid
        from agent.tools import RoleplayTool

        max_turns_by_difficulty = {
            "beginner": 6,
            "intermediate": 7,
            "advanced": 8,
        }
        max_turns = max_turns_by_difficulty.get(str(request.difficulty or "").strip().lower(), 6)
        
        # Generate unique roleplay ID
        roleplay_id = str(uuid.uuid4())
        
        # Use tool to generate opening
        tool = RoleplayTool(agent.client)
        raw = tool.execute(
            scenario=request.topic,
            persona_type=request.persona_type,
            difficulty=request.difficulty,
            custom_description=request.custom_description
        )
        
        # Extract JSON
        result = agent._extract_json(raw)
        
        # Store session
        user_goal = result.get("user_goal", f"Practice your {request.topic} skills")
        scene_context = result.get("scene_context", "")
        roleplay_sessions[roleplay_id] = {
            "topic": request.topic,
            "difficulty": request.difficulty,
            "persona_type": request.persona_type,
            "persona_name": result.get("persona_name", "AI Character"),
            "conversation_history": [],
            "turn_count": 0,
            "scene_context": scene_context,
            "user_goal": user_goal,
            "goal_progress": 0,
            "max_turns": max_turns,
            "custom_description": request.custom_description,
            "hint_count": 0,
            "last_active": time.time(),
            "client_ip": client_ip,
        }
        _ip_sessions[client_ip].add(roleplay_id)
        roleplay_start_limiter.record(client_ip)
        
        return {
            "roleplay_id": roleplay_id,
            "persona_name": result.get("persona_name", "AI Character"),
            "persona_type": request.persona_type,
            "opening_line": result.get("opening_line", "Hello! Let's practice."),
            "scene_context": scene_context or f"Practicing {request.topic}",
            "user_goal": user_goal,
            "max_turns": max_turns,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/roleplay-message", response_model=RoleplayMessageResponse)
def roleplay_message(request: RoleplayMessageRequest, req: Request):
    """Send a message in an active roleplay session."""
    # Rate limit
    client_ip = _get_client_ip(req)
    err = roleplay_msg_limiter.check(client_ip)
    if err:
        raise HTTPException(status_code=429, detail=err)

    try:
        from agent.tools import RoleplayResponseTool

        def _as_str(value: Any, default: str = "") -> str:
            if value is None:
                return default
            return str(value)

        def _as_list_of_str(value: Any) -> List[str]:
            if value is None:
                return []
            if isinstance(value, list):
                return [str(v) for v in value if str(v).strip()]
            # Sometimes the model returns a single string instead of a list
            return [str(value)] if str(value).strip() else []

        def _score_0_100(value: Any, default: int = 75) -> int:
            try:
                if isinstance(value, str):
                    cleaned = value.strip().replace("%", "")
                    value = cleaned
                score = int(float(value))
            except Exception:
                score = default
            return max(0, min(100, score))

        def _as_goal_status(value: Any) -> str:
            status = str(value or "").strip().lower()
            if status in {"in_progress", "off_track", "achieved"}:
                return status
            return "in_progress"
        
        # Get session (with TTL check)
        session = roleplay_sessions.get(request.roleplay_id)
        if not session:
            raise HTTPException(status_code=404, detail="Roleplay session not found")
        if time.time() - session.get("last_active", 0) > SESSION_TTL_SECONDS:
            roleplay_sessions.pop(request.roleplay_id, None)
            ip = session.get("client_ip", "")
            _ip_sessions.get(ip, set()).discard(request.roleplay_id)
            raise HTTPException(status_code=410, detail="Session expired due to inactivity.")
        session["last_active"] = time.time()

        mode = (request.mode or "chat").strip().lower()

        # Word-count validation for user messages
        user_message_raw = (request.user_message or "").strip()
        if mode != "hint" and user_message_raw:
            word_count = len(user_message_raw.split())
            if word_count > MAX_ROLEPLAY_MSG_WORDS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Message too long ({word_count} words). Keep it under {MAX_ROLEPLAY_MSG_WORDS} words.",
                )

        # Hint cap
        if mode == "hint":
            hint_count = int(session.get("hint_count", 0))
            if hint_count >= MAX_HINTS_PER_SESSION:
                raise HTTPException(
                    status_code=429,
                    detail=f"You've used all {MAX_HINTS_PER_SESSION} coach hints for this session.",
                )
            session["hint_count"] = hint_count + 1
        consume_turn = request.consume_turn
        if consume_turn is None:
            consume_turn = mode != "hint"

        # Server-side turn count is the source of truth.
        if consume_turn:
            session["turn_count"] = int(session.get("turn_count") or 0) + 1

        effective_turn = int(session.get("turn_count") or 0)
        max_turns = int(session.get("max_turns") or 0)
        turns_remaining = max(0, max_turns - effective_turn)

        # Hard cap: do not generate further dialogue once out of turns.
        if consume_turn and max_turns and effective_turn > max_turns:
            return RoleplayMessageResponse(
                type="session_end",
                session_over=True,
                final_message="Out of turns — session complete.",
                goal_progress=_score_0_100(session.get("goal_progress"), default=0),
                goal_status="in_progress",
                achieved=False,
                turns_remaining=0,
            )
        
        user_message = user_message_raw
        if mode != "hint":
            session["conversation_history"].append({
                "role": "user",
                "message": user_message
            })
        
        # Generate response
        tool = RoleplayResponseTool(agent.client)
        raw = tool.execute(
            persona_type=session["persona_type"],
            persona_name=session["persona_name"],
            conversation_history=session["conversation_history"],
            user_message=user_message,
            turn_count=effective_turn,
            scenario=session["topic"],
            scene_context=_as_str(session.get("scene_context"), default=""),
            user_goal=_as_str(session.get("user_goal"), default=""),
            turns_remaining=turns_remaining,
            mode=mode,
        )
        
        result = agent._extract_json(raw)

        if not isinstance(result, dict):
            raise HTTPException(status_code=500, detail="Invalid model output: expected JSON object")
        
        response_type = result.get("type", "dialogue")

        goal_progress = _score_0_100(result.get("goal_progress"), default=_score_0_100(session.get("goal_progress"), default=0))
        goal_status = _as_goal_status(result.get("goal_status"))
        achieved = bool(result.get("achieved")) or goal_status == "achieved" or goal_progress >= 100
        session["goal_progress"] = goal_progress
        
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
                goal_progress=goal_progress,
                goal_status=goal_status,
                achieved=achieved,
                turns_remaining=turns_remaining,
                politeness_score=_score_0_100(result.get("politeness_score"), default=75),
                grammar_notes=_as_list_of_str(result.get("grammar_notes")),
                vocab_suggestions=_as_list_of_str(result.get("vocab_suggestions")),
                encouragement=_as_str(result.get("encouragement"), default="Keep going!"),
                persona_resume=_as_str(result.get("persona_resume"), default="")
            )
        else:
            # Regular dialogue
            persona_response = _as_str(result.get("persona_response"), default="...")
            
            session["conversation_history"].append({
                "role": "persona",
                "message": persona_response
            })
            
            return RoleplayMessageResponse(
                type="dialogue",
                goal_progress=goal_progress,
                goal_status=goal_status,
                achieved=achieved,
                turns_remaining=turns_remaining,
                persona_response=persona_response
            )

        # Record rate-limit hit only on success
        roleplay_msg_limiter.record(client_ip)
    
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
        
        # Clean up session + IP tracker
        ip = session.get("client_ip", "")
        _ip_sessions.get(ip, set()).discard(request.roleplay_id)
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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
