# Scaling to a Paid Service — Architecture & Design Plan

> **Question**: How can I add user sessions with authentication, expand this project into a payable service, what features do I need, do I need a database, which kind — Redis or PostgreSQL — and what to store in each?

---

## 1. Authentication & User Sessions

### Recommended: **Supabase Auth** or **Firebase Auth** (fastest) OR **custom JWT** (most control)

**Flow:**
```
User → Sign up (email/password or Google OAuth)
     → Receives JWT access token + refresh token
     → Frontend stores JWT in memory (not localStorage)
     → Every API call sends: Authorization: Bearer <token>
     → Backend validates JWT on each request
```

**Backend changes:**
- Add a FastAPI dependency (`get_current_user`) that decodes the JWT and returns the user ID
- Replace per-IP rate limiting with **per-user** rate limiting (much more accurate)
- Replace `_get_client_ip(req)` with `user.id` as the rate limit key

**Frontend changes:**
- Add Login/Signup pages
- Add an auth context provider (React Context)
- Add axios interceptor to attach `Authorization` header to every request
- Protect routes (redirect to login if not authenticated)

---

## 2. Database: You Need **Both** PostgreSQL AND Redis

They serve completely different purposes:

| | **PostgreSQL** | **Redis** |
|---|---|---|
| **Purpose** | Persistent data (users, history, billing) | Ephemeral data (sessions, rate limits, cache) |
| **Data lifetime** | Forever | Minutes to hours |
| **Speed** | Fast for queries | Ultra-fast for key-value lookups |
| **Cost** | Cheap for moderate storage | Cheap for small datasets |

### What goes in **PostgreSQL**:

```sql
-- Core
users                 (id, email, name, password_hash, created_at, plan)
subscriptions         (id, user_id, plan, stripe_customer_id, status, expires_at)

-- Learning data (the real product value)
practice_sessions     (id, user_id, topic, difficulty, created_at)
practice_exercises    (id, session_id, question, type, correct_answer, user_answer, is_correct)
score_results         (id, session_id, score_pct, weak_areas[], recommendations)

roleplay_sessions     (id, user_id, topic, persona_name, difficulty, turns, goal_achieved, created_at)
roleplay_messages     (id, session_id, role, message, turn_num, timestamp)

tutor_conversations   (id, user_id, question_context, created_at)
tutor_messages        (id, conversation_id, role, content, timestamp)

-- Analytics (for the business)
user_progress         (user_id, weak_areas[], total_exercises, total_roleplays, streak_days)
usage_logs            (user_id, endpoint, tokens_used, timestamp)
```

**Why this matters**: 
- Users can see their **learning history** and **progress over time**
- You can show **weak area trends** ("Your grammar improved 30% this month")
- You know **exactly how many tokens each user burns** (for pricing)

### What goes in **Redis**:

```
rate_limits:user:{user_id}:tutor       → sorted set of timestamps
rate_limits:user:{user_id}:roleplay    → sorted set of timestamps
session:{session_id}                   → JSON blob (active roleplay state)
auth:refresh:{token}                   → user_id (with TTL)
cache:personas:{scenario_hash}         → cached persona suggestions (save tokens!)
```

**Why Redis**:
- Your current `RateLimiter` class is in-memory — it **dies on server restart**. Redis persists across deploys.
- Your `roleplay_sessions` dict is in-memory — same problem. Redis with TTL replaces your manual GC.
- Persona caching: if someone already searched "ordering at a restaurant", cache the 4 personas for 1 hour. Saves an OpenAI call.

---

## 3. Monetization: Subscription Tiers

### Recommended: **Stripe** for payments

| | **Free** | **Basic ($9/mo)** | **Pro ($19/mo)** |
|---|---|---|---|
| Practice exercises | 3/day | 20/day | Unlimited |
| Roleplay sessions | 1/day | 10/day | Unlimited |
| Tutor questions | 5/day | 30/day | Unlimited |
| Persona suggestions | 2/day | 10/day | Unlimited |
| Roleplay turns | 6 max | 10 max | 15 max |
| Coach hints | 1/session | 3/session | Unlimited |
| History & progress | Last 7 days | Last 90 days | All time |
| **Model** | gpt-4o-mini | gpt-4o-mini | **gpt-4o** |
| Priority | — | — | Faster responses |

### How billing works:

```
User signs up (Free tier) 
  → Wants more? Clicks "Upgrade" 
  → Stripe Checkout session (hosted payment page)
  → Stripe webhook → your backend updates `subscriptions` table
  → User's plan changes → rate limits adjust automatically
```

### Backend design for usage quotas:

```python
# Replace flat rate limits with plan-aware limits
PLAN_LIMITS = {
    "free":  {"practice": 3,  "roleplay": 1,  "tutor": 5,  "personas": 2},
    "basic": {"practice": 20, "roleplay": 10, "tutor": 30, "personas": 10},
    "pro":   {"practice": -1, "roleplay": -1, "tutor": -1, "personas": -1},  # -1 = unlimited
}

async def check_usage(user_id: str, feature: str):
    plan = await get_user_plan(user_id)          # from PostgreSQL
    limit = PLAN_LIMITS[plan][feature]
    if limit == -1: return  # unlimited
    today_count = await redis.get(f"usage:{user_id}:{feature}:{today}")  # from Redis
    if int(today_count or 0) >= limit:
        raise HTTPException(status_code=403, detail="Daily limit reached. Upgrade your plan!")
```

---

## 4. Features to Add (Priority Order)

### Must-have for paid service:
1. **Auth** (signup, login, OAuth with Google)
2. **Usage dashboard** — "You've used 3/5 practice sessions today"
3. **Learning history** — past exercises, scores, roleplay transcripts
4. **Progress tracking** — weak area trends, streak counter, score improvement chart
5. **Stripe integration** — checkout, webhook, plan management
6. **Usage quota enforcement** — per-feature daily limits based on plan

### High-value additions:
7. **Spaced repetition** — resurface weak-area exercises after 1, 3, 7 days
8. **Leaderboard / streaks** — gamification to drive retention
9. **PDF/email reports** — "Your weekly learning summary"
10. **Custom vocabulary lists** — save words from roleplay sessions
11. **Multiple languages** — expand beyond English (the prompts are easy to adapt)

### Infrastructure:
12. **Error monitoring** (Sentry)
13. **Analytics** (PostHog or Mixpanel)
14. **Token usage tracking** — know your OpenAI costs per user
15. **Admin dashboard** — view user count, revenue, token spend

---

## 5. Recommended Tech Stack for Production

```
Auth:         Supabase Auth  (or NextAuth if you switch to Next.js)
Database:     Supabase PostgreSQL  (managed, free tier available)
Cache:        Upstash Redis  (serverless, pay-per-request, free tier)
Payments:     Stripe  (industry standard)
Hosting:      Railway / Render (backend) + Vercel (frontend)
Monitoring:   Sentry (errors) + PostHog (analytics)
```

**Why Supabase**: It gives you PostgreSQL + Auth + Row Level Security in one service. Free tier is generous. You skip building auth from scratch.

**Why Upstash Redis**: Serverless, no server to manage, free tier = 10K requests/day.

---

## 6. Database Schema Summary

```
PostgreSQL (persistent):
├── users, subscriptions           → Auth & billing
├── practice_sessions, exercises   → Exercise history
├── roleplay_sessions, messages    → Chat history
├── tutor_conversations, messages  → Tutor Q&A history
├── user_progress                  → Analytics & progress
└── usage_logs                     → Token tracking for cost control

Redis (ephemeral):
├── rate_limits:*                  → Sliding window counters
├── session:*                      → Active roleplay state (replaces in-memory dict)
├── usage:{user}:{feature}:{date}  → Daily quota counters (with midnight TTL)
└── cache:personas:*               → Cached AI responses (1hr TTL)
```

---

## TL;DR

| Question | Answer |
|---|---|
| Need a database? | **Yes, both PostgreSQL and Redis** |
| PostgreSQL for what? | Users, billing, learning history, progress |
| Redis for what? | Rate limits, active sessions, daily quotas, caching |
| Auth approach? | JWT via Supabase Auth (easiest) or custom |
| Payment? | Stripe subscriptions with 3 tiers |
| Hardest part? | The billing quota system + learning progress dashboard |
| Estimated effort? | 2-3 weeks for auth + DB + Stripe. 1-2 more for progress features. |
