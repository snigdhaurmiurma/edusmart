"""Intelligent Routine Generator router (SRS 4.8)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoutineBlock, User
from app.schemas import RoutineGenerateRequest
from app.security import get_current_user
from app.services.routine_engine import build_adaptive_routine

router = APIRouter(prefix="/api/routine", tags=["routine"])


def _serialize_block(b: RoutineBlock) -> dict:
    return {
        "id": b.id,
        "day_label": b.day_label,
        "period": b.period,
        "start_label": b.start_label,
        "end_label": b.end_label,
        "title": b.title,
        "course_code": b.course_code,
        "category": b.category,
        "priority": b.priority,
        "completed": b.completed,
    }


def _summary(blocks: list[RoutineBlock]) -> dict:
    total = len(blocks)
    done = sum(1 for b in blocks if b.completed)
    pct = round((done / total) * 100.0, 1) if total else 0.0
    return {
        "blocks": [_serialize_block(b) for b in blocks],
        "completed_count": done,
        "total_count": total,
        "completion_rate": pct,
        "streak_days": 6 + (1 if pct >= 50 else 0),
    }


@router.get("")
def get_routine(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    blocks = (
        db.query(RoutineBlock)
        .filter(RoutineBlock.user_id == current_user.id)
        .order_by(RoutineBlock.id.asc())
        .all()
    )
    if not blocks:
        blocks = build_adaptive_routine(db, current_user.id)
    return _summary(blocks)


@router.post("/generate")
def generate_routine(
    payload: RoutineGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    blocks = build_adaptive_routine(
        db=db,
        user_id=current_user.id,
        wake_hour=payload.wake_hour,
        sleep_hour=payload.sleep_hour,
        focus_window=payload.focus_window,
        break_minutes=payload.break_minutes,
        study_hours_target=payload.study_hours_target,
    )
    return _summary(blocks)


@router.patch("/{block_id}/toggle")
def toggle_block(
    block_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    block = (
        db.query(RoutineBlock)
        .filter(RoutineBlock.id == block_id, RoutineBlock.user_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=404, detail="Routine block not found.")
    block.completed = not block.completed
    db.commit()
    blocks = (
        db.query(RoutineBlock)
        .filter(RoutineBlock.user_id == current_user.id)
        .order_by(RoutineBlock.id.asc())
        .all()
    )
    return _summary(blocks)
