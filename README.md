# EduSmart — Your All-in-One AI Academic Assistant

[![CI](https://github.com/snigdhaurmiurma/edusmart/actions/workflows/ci.yml/badge.svg)](https://github.com/snigdhaurmiurma/edusmart/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**EduSmart** is a full-stack AI-powered academic support platform built for university students. It unifies three specialized RAG chatbots (**UNIQ**, **Advisor**, and **Research**), a **Handwritten Notes Digitizer (OCR)**, an **AI Quiz Generator**, a **Smart Academic Calendar**, an **Intelligent Routine Generator**, **UCAM/ELMS Sync**, **Student Analytics**, **Community Feedback**, and an **RBAC Admin Console** into one cohesive workflow.

> **Connected Study Loop:** Digitize Notes → Ask Cited Questions in UNIQ Chat → Generate Grounded Practice Quizzes → Schedule Adaptive Study Routines Around Weak Topics.

---

## Key Features

### Student Workspace
- **3 Specialized AI Assistants (`UNIQ`, `Advisor`, `Research`)**: Shared Hybrid RAG engine (BM25 + dense cosine similarity) with strict pre-ranking tenant isolation, SSE streaming, inline citations, personal-note consent toggle, and clickable **Action Chips** (add to calendar, generate quiz, refresh routine).
- **Handwritten Notes Digitizer (OCR)**: Upload PNG, JPG, WEBP, PDF, TXT, or Markdown files; flags low-confidence lines for review; live Markdown editor with automatic RAG re-indexing; exports to **PDF**, **Markdown**, and **TXT**; guarantees cascade vector purge on deletion.
- **AI-Powered Quiz Generator**: Creates grounded MCQs and short-answer questions from digitized notes or course topics, supports timed mode, instant grading with explanations, and topic mastery breakdowns.
- **Smart Academic Calendar**: Color-coded classes, exams, assignments, and study blocks with overlap conflict detection, 1-click auto-resolution, and **iCalendar (`.ics`)** export.
- **Intelligent Routine Generator**: Builds realistic Morning, Afternoon, and Evening study blocks around fixed schedules, urgent deadlines, peak focus windows, and weak quiz topics with streak tracking.
- **UCAM & ELMS Sync**: Idempotent course and assignment synchronization into Smart Calendar and Advisor Bot.
- **Student Analytics & Privacy**: Recharts study-hour & score progression charts, CSV study report export, granular AI/OCR/Sync consent toggles, and 1-click **GDPR JSON data export**.

### RBAC Admin Console
- Platform KPI cards, **User Growth** analytics chart, and **Feature Usages** breakdown.
- User lifecycle management (enable/disable accounts), institutional RAG policy/FAQ publishing, feedback triage, global broadcast announcements, RAG retrieval latency/hit-rate monitoring, and security audit trails.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Recharts, Lucide Icons, custom responsive CSS design system (Light & Dark themes)
- **Backend**: FastAPI, SQLAlchemy 2.x, Pydantic v2, PyJWT, fpdf2, pypdf, httpx
- **AI / Retrieval**: Built-in Hybrid RAG (BM25 + dense cosine) out-of-the-box, with optional `OPENAI_API_KEY` or `GEMINI_API_KEY` plug-in support
- **Database**: SQLite (zero-config local/serverless) or PostgreSQL via `DATABASE_URL`
- **DevOps & Testing**: Pytest API integration suite, GitHub Actions CI, Docker Compose, and Vercel full-stack deployment (`vercel.json` + `api/index.py`)

---

## Quick Start (Local)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

### Pre-Seeded Demo Accounts
- **Demo Student**: `student@edusmart.edu` / `Student@123` *(or click **Watch Demo** on the landing page)*
- **Demo Admin**: `admin@edusmart.edu` / `Admin@123`

---

## Deploy to Vercel (Full-Stack)

This repository includes [`vercel.json`](vercel.json) and [`api/index.py`](api/index.py) so both the React frontend and FastAPI backend deploy together automatically:

1. Visit [vercel.com/new](https://vercel.com/new) and import `snigdhaurmiurma/edusmart`.
2. Leave default build settings (`vercel.json` configures `frontend/dist` and `/api/*` automatically) and click **Deploy**.
3. *(Optional)* Add `DATABASE_URL` (PostgreSQL), `JWT_SECRET`, and `OPENAI_API_KEY` or `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables. Without keys, the built-in Hybrid RAG engine and pre-seeded demo workspace work immediately.

---

## Running Tests

```bash
python -m pytest backend/tests/test_api.py -v
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed architecture, RAG isolation guarantees, and security controls.

## License

MIT — see [`LICENSE`](LICENSE).
