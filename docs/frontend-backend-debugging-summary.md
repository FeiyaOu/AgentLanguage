# LanguageAssistant Debugging Summary (Frontend + Backend)

Date: 2026-01-13

## Project context

This repo is a small full‑stack “Language Learning Agent” application:

- The **frontend** is a Vite + React + TypeScript app under [frontend/](../frontend/).
  - It calls the backend via Axios (see [frontend/src/api.ts](../frontend/src/api.ts)).
  - It defines shared request/response shapes in TypeScript (see [frontend/src/types.ts](../frontend/src/types.ts)).
- The **backend** is a FastAPI app under [backend/](../backend/).
  - It exposes endpoints like `/api/generate-practice` and `/api/score-answers` (see [backend/main.py](../backend/main.py)).
  - It calls an LLM (OpenAI client) to generate/score exercises (see [backend/agent/tools.py](../backend/agent/tools.py) and [backend/agent/agent.py](../backend/agent/agent.py)).

This document summarizes the main bugs encountered when running backend + frontend locally, how they were identified, and how they were fixed.

---

## Bug 1 — Browser blank page: “types.ts does not provide an export named Exercise”

### Symptom

When opening the Vite dev server in the browser, the page rendered nothing and the console showed:

- `Uncaught SyntaxError: The requested module '/src/types.ts' does not provide an export named 'Exercise' (at api.ts:2:10)`

### Root cause

In TypeScript, `interface` and most `type` declarations are **type‑only** and are erased at runtime.

- [frontend/src/types.ts](../frontend/src/types.ts) declares `Exercise` as an `interface`.
- [frontend/src/api.ts](../frontend/src/api.ts) originally imported it using a normal ESM import:
  - `import { Exercise, ScoreResult } from './types'`

That kind of import is treated as a runtime import by the browser/Vite. At runtime there is no JS export named `Exercise`, so the module loader throws, and React never mounts → blank page.

### How we identified it

- The browser error pointed directly at an ESM import mismatch.
- We opened both files to confirm that `Exercise` is an interface (type‑only) and the import was not type‑only.

### Fix

Convert those imports to **type‑only imports** so no runtime import is generated:

- Updated [frontend/src/api.ts](../frontend/src/api.ts) to:
  - `import type { Exercise, ScoreResult } from './types'`

We then scanned for other imports from `types.ts` with grep and found two more:

- [frontend/src/pages/Practice.tsx](../frontend/src/pages/Practice.tsx)
- [frontend/src/pages/Feedback.tsx](../frontend/src/pages/Feedback.tsx)

and converted them to `import type { ... }` as well.

---

## Bug 2 — Requests blocked: CORS preflight failing (OPTIONS 400)

### Symptom

From the browser, Axios requests to the backend failed with CORS errors such as:

- `blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header ...`

Backend logs showed:

- `"OPTIONS /api/generate-practice" 400 Bad Request`

### Root cause

The backend already had CORS middleware, but the allowlist did not include the **actual** Vite dev server origin.

- Vite was running on `http://localhost:5175` (because ports 5173/5174 were in use).
- The backend allowlist only included `http://localhost:5173` and `http://localhost:3000`.

So the browser’s preflight `OPTIONS` request did not match the configured origins and was rejected.

### How we identified it

- Browser error showed the exact blocked origin (`http://localhost:5175`).
- Backend logs confirmed preflight was failing (`OPTIONS` 400).
- We located the CORS middleware configuration in [backend/main.py](../backend/main.py).

### Fix

Expand `allow_origins` to include the Vite port(s) in use and common localhost variants:

- Updated [backend/main.py](../backend/main.py) `allow_origins` to include:
  - `http://localhost:5175` (and 5173/5174)
  - `http://127.0.0.1:5175` (and 5173/5174)
  - `http://localhost:3000` and `http://127.0.0.1:3000`

After restart, backend logs changed to:

- `"OPTIONS /api/generate-practice" 200 OK`

### Diagnostic tip we used

We used a `curl` command to simulate the browser preflight and check headers:

```bash
curl -i -X OPTIONS "http://localhost:8000/api/generate-practice" \
  -H "Origin: http://localhost:5175" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

This is a fast way to confirm whether the backend returns the expected `Access-Control-Allow-*` headers.

---

## Bug 3 — Backend 500 on POST (after CORS was fixed)

### Symptom

Once CORS was fixed, requests reached the backend but sometimes returned:

- `POST /api/generate-practice 500 Internal Server Error`

### Root cause

The backend expects the agent/tool output to be valid JSON, but LLMs can return JSON with formatting wrappers:

- JSON inside ```json fenced code blocks
- Extra explanatory text before/after the JSON

When that happened, JSON parsing could fail, leaving `current_exercises` empty and triggering downstream errors (e.g., “Failed to generate exercises”).

### How we identified it

- CORS preflight succeeded (`OPTIONS 200`), so network blocking was resolved.
- We reproduced the endpoint with `curl` and observed when it returned 200 vs 500.
- We inspected how tool results were parsed in [backend/agent/agent.py](../backend/agent/agent.py).

### Fix

Harden JSON parsing for tool outputs:

- Added a best‑effort extractor (`_extract_json`) in [backend/agent/agent.py](../backend/agent/agent.py) that:
  - strips ``` / ```json fences
  - tries direct `json.loads`
  - falls back to extracting the first JSON array/object substring

This makes `/api/generate-practice` much less sensitive to formatting variations in model output.

---

## What “good” looks like after fixes

- Frontend loads without runtime import/export errors.
- Browser console shows no CORS errors.
- Backend logs show `OPTIONS ... 200` and `POST ... 200`.
- A direct test works:

```bash
curl -i -X POST "http://localhost:8000/api/generate-practice" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5175" \
  --data '{"topic":"test","difficulty":"beginner","focus_areas":[]}'
```

You should see `HTTP/1.1 200 OK` and a JSON body with `exercises`.

---

## Files changed

- [frontend/src/api.ts](../frontend/src/api.ts)
- [frontend/src/pages/Practice.tsx](../frontend/src/pages/Practice.tsx)
- [frontend/src/pages/Feedback.tsx](../frontend/src/pages/Feedback.tsx)
- [backend/main.py](../backend/main.py)
- [backend/agent/agent.py](../backend/agent/agent.py)
