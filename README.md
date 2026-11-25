# EduSmart — Your All-in-One AI Academic Assistant

[![CI](https://github.com/snigdhaurmiurma/edusmart/actions/workflows/ci.yml/badge.svg)](https://github.com/snigdhaurmiurma/edusmart/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**EduSmart** is a unified full-stack AI academic support platform for university students. Both the React + TypeScript frontend and the single-file FastAPI backend (`api/index.py`) live in one repository root for seamless 1-click deployment on Vercel.

---

## Key Features

- **3 Specialized AI Assistants (`UNIQ`, `Advisor`, `Research`)**: Built on a Hybrid RAG engine (BM25 + dense cosine similarity) with strict pre-ranking tenant isolation, SSE streaming, source citations, personal-note consent controls, and clickable Action Chips.
- **Handwritten Notes Digitizer (OCR)**: Upload PNG, JPG, WEBP, PDF, TXT, or Markdown files; flags low-confidence lines; live Markdown editor with automatic RAG re-indexing; pure-Python **PDF**, **Markdown**, and **TXT** export; cascade vector purge on delete.
- **AI-Powered Quiz Generator**: Grounded MCQs and short-answer questions with timed mode, automated grading, explanations, and topic mastery tracking.
- **Smart Academic Calendar & Routine Generator**: Color-coded tasks and exams, inline quick-add from the Dashboard, overlap conflict detection with 1-click auto-resolution, `.ics` export, and adaptive Morning/Afternoon/Evening study blocks.
- **Courses & UCAM/ELMS Sync**: Add/manage your own university courses or reconcile schedules and assignments via UCAM/ELMS sync.
- **Analytics, Feedback, Privacy & RBAC Admin Console**: Live Recharts visualizations, CSV study reports, community upvoting, GDPR JSON data export, and an Admin Console showing real database metrics, user lifecycle controls, RAG policy publishing, and audit logs.

---

## Project Structure (Single-Project Vercel Ready)

```
edusmart/
├── api/
│   └── index.py          # Complete FastAPI backend (single Vercel Python Function)
├── src/                  # React 19 + TypeScript frontend (Vite root)
├── tests/
│   └── test_api.py       # End-to-end pytest API & RAG isolation suite
├── vercel.json           # Routes /api/* -> api/index.py and /* -> SPA index.html
├── requirements.txt      # Lightweight pure-Python backend dependencies
├── package.json          # Root Vite build & dev scripts
└── docs/ARCHITECTURE.md  # System architecture & security notes
```

---

## One-Click Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `snigdhaurmiurma/edusmart`.
2. Leave all settings at their defaults (Root Directory `./`, Framework Preset `Vite`) and click **Deploy**.
3. *(Optional)* Add `DATABASE_URL` (PostgreSQL), `JWT_SECRET`, and `OPENAI_API_KEY` or `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables.

---

## Local Development

```bash
# Terminal 1 — Backend API
pip install -r requirements.txt uvicorn
uvicorn api.index:app --reload --port 8000

# Terminal 2 — Frontend
npm install
npm run dev
```

### Run Automated Tests
```bash
python -m pytest tests/test_api.py -v
```

### Demo Credentials
- **Student**: `student@edusmart.edu` / `Student@123` *(or create your own account on the Sign Up screen)*
- **Admin**: `admin@edusmart.edu` / `Admin@123`

## License
MIT — see [`LICENSE`](LICENSE).
