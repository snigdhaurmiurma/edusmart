"""UCAM & ELMS Institutional Sync router (SRS 4.10)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Assignment, Course, SyncLog, User
from app.security import get_current_user
from app.services.sync_engine import run_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status")
def get_sync_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.user_id == current_user.id).order_by(Course.code.asc()).all()
    assignments = (
        db.query(Assignment)
        .filter(Assignment.user_id == current_user.id)
        .order_by(Assignment.due_at.asc())
        .all()
    )
    logs = (
        db.query(SyncLog)
        .filter(SyncLog.user_id == current_user.id)
        .order_by(SyncLog.created_at.desc())
        .limit(8)
        .all()
    )
    return {
        "consent_enabled": current_user.consent_ucam_sync,
        "last_sync_at": logs[0].created_at.isoformat() if logs else None,
        "courses": [
            {
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "instructor": c.instructor,
                "credits": c.credits,
                "schedule": c.schedule,
                "status": c.status,
                "grade": c.grade,
                "source": c.source,
            }
            for c in courses
        ],
        "assignments": [
            {
                "id": a.id,
                "course_code": a.course_code,
                "title": a.title,
                "due_at": a.due_at.isoformat(),
                "status": a.status,
                "source": a.source,
            }
            for a in assignments
        ],
        "logs": [
            {
                "id": lg.id,
                "provider": lg.provider,
                "status": lg.status,
                "items_synced": lg.items_synced,
                "message": lg.message,
                "created_at": lg.created_at.isoformat(),
            }
            for lg in logs
        ],
    }


@router.post("/trigger")
def trigger_sync(
    provider: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.consent_ucam_sync:
        raise HTTPException(
            status_code=403,
            detail="UCAM/ELMS sync consent is disabled in your Profile & Privacy settings.",
        )
    if provider not in ("ucam", "elms", "all"):
        raise HTTPException(status_code=400, detail="Provider must be ucam, elms, or all.")
    log = run_sync(db, current_user.id, provider)
    return {
        "status": log.status,
        "provider": log.provider,
        "items_synced": log.items_synced,
        "message": log.message,
        "created_at": log.created_at.isoformat(),
    }
