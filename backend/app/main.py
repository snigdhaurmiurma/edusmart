"""EduSmart FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import (
    admin,
    analytics,
    auth,
    calendar,
    chat,
    feedback,
    notes,
    notifications,
    quizzes,
    routine,
    sync,
)
from app.seed import seed_demo_data


def init_database() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="EduSmart API",
        version=settings.app_version,
        description="AI-Powered Academic Support Platform — Hybrid RAG, Notes Digitizer, Quizzes, Smart Calendar & Routine Engine.",
        lifespan=lifespan,
    )

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Ensure tables and demo accounts exist even in serverless cold starts where lifespan may be bypassed
    init_database()

    app.include_router(auth.router)
    app.include_router(chat.router)
    app.include_router(notes.router)
    app.include_router(quizzes.router)
    app.include_router(calendar.router)
    app.include_router(routine.router)
    app.include_router(sync.router)
    app.include_router(feedback.router)
    app.include_router(notifications.router)
    app.include_router(analytics.router)
    app.include_router(admin.router)

    @app.get("/api/health", tags=["health"])
    def health_check():
        return {
            "status": "ok",
            "service": "edusmart-api",
            "version": settings.app_version,
        }

    return app


app = create_app()
