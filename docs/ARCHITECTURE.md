# EduSmart — System Architecture

## 1. High-Level Architecture

EduSmart is designed as a modular full-stack web application with a clean separation between presentation, domain engines, retrieval/indexing, and persistence:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      React 19 + TypeScript SPA                          │
│  Landing • Auth • Dashboard • UNIQ/Advisor/Research Chat • Notes OCR   │
│  Quiz Runner • Smart Calendar • Routine Planner • Sync • Admin Console  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTPS REST + SSE Streaming (/api/*)
┌───────────────────────────────────▼─────────────────────────────────────┐
│                        FastAPI Application                              │
│  • Auth & RBAC (PBKDF2-SHA256, JWT, lockout, audit trail, GDPR export)  │
│  • Hybrid RAG Service (BM25 + dense cosine, pre-ranking tenant filter)  │
│  • Provider-Agnostic AI Adapter (OpenAI / Gemini / built-in grounded)   │
│  • Notes OCR & Export Engine (Markdown, TXT, binary PDF via fpdf2)      │
│  • Quiz Engine (grounded generation, grading, topic mastery scoring)    │
│  • Conflict-Aware Calendar (.ics) & Adaptive Study Routine Scheduler    │
│  • UCAM & ELMS Idempotent Sync Engine                                   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ SQLAlchemy 2.x ORM
┌───────────────────────────────────▼─────────────────────────────────────┐
│              SQLite (Local / Vercel Demo) or PostgreSQL                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Hybrid RAG & Tenant Isolation Pipeline

1. **Ingestion & Chunking**: Student notes and admin-published institutional documents are split into overlapping chunks (`max_chars=420`, `overlap=60`) and projected into normalized dense vectors.
2. **Pre-Ranking Tenant Isolation**: Before any scoring occurs, SQL filtering enforces `tenant_user_id IS NULL OR tenant_user_id = current_user.id` (or `IS NULL` only when personal-note consent is toggled off). Cross-tenant retrieval is impossible by construction.
3. **Hybrid Scoring**: Combines normalized BM25 lexical relevance (`0.62`) with dense cosine similarity (`0.38`) and logs `retrieval@k`, `hit@1`, and latency to `rag_telemetry`.
4. **Cascade Vector Purge**: Deleting a note atomically deletes all associated `rag_chunks` rows and records an audit event.

## 3. Security & Privacy Controls

- **Password Storage**: PBKDF2-HMAC-SHA256 with 260,000 iterations and per-user random salt.
- **Brute-Force Defense**: Automatic account lockout after repeated failed login attempts.
- **Role-Based Access Control (RBAC)**: Strict `student` and `admin` guards enforced server-side.
- **Consent & Portability**: Granular toggles for RAG personal notes, OCR processing, and UCAM/ELMS sync, plus 1-click JSON GDPR archive export.

## 4. Deployment Topologies

- **Vercel Full-Stack**: `vercel.json` builds `frontend/dist` and routes `/api/*` to the FastAPI ASGI serverless function in `api/index.py`.
- **Docker Compose**: `docker-compose.yml` launches the FastAPI backend and Vite dev server locally.
