"""Feedback Collection & Community Upvoting router (SRS 4.9)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FeedbackEntry, FeedbackUpvote, Notification, User
from app.schemas import FeedbackCreateRequest
from app.security import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.get("")
def list_feedback(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = (
        db.query(FeedbackEntry)
        .filter(FeedbackEntry.status != "hidden")
        .order_by(FeedbackEntry.upvotes.desc(), FeedbackEntry.created_at.desc())
        .all()
    )
    my_upvotes = {
        u.feedback_id
        for u in db.query(FeedbackUpvote).filter(FeedbackUpvote.user_id == current_user.id).all()
    }
    avg_rating = round(sum(e.rating for e in entries) / len(entries), 2) if entries else 0.0
    return {
        "average_rating": avg_rating,
        "total_count": len(entries),
        "entries": [
            {
                "id": e.id,
                "author_name": e.author_name,
                "rating": e.rating,
                "category": e.category,
                "message": e.message,
                "status": e.status,
                "upvotes": e.upvotes,
                "upvoted_by_me": e.id in my_upvotes,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = FeedbackEntry(
        user_id=current_user.id,
        author_name=current_user.full_name,
        rating=payload.rating,
        category=payload.category,
        message=payload.message.strip(),
        status="open",
        upvotes=1,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    db.add(FeedbackUpvote(feedback_id=entry.id, user_id=current_user.id))
    db.add(
        Notification(
            user_id=current_user.id,
            title="Thank you for your feedback!",
            message=f"Your {payload.category} submission ({payload.rating}/5 stars) has been received for review.",
            category="feedback",
            action_route="feedback",
        )
    )
    db.commit()
    return {
        "id": entry.id,
        "message": "Feedback submitted successfully. Thank you for helping improve EduSmart!",
    }


@router.post("/{feedback_id}/upvote")
def toggle_upvote(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.get(FeedbackEntry, feedback_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Feedback entry not found.")
    existing = (
        db.query(FeedbackUpvote)
        .filter(FeedbackUpvote.feedback_id == feedback_id, FeedbackUpvote.user_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        entry.upvotes = max(0, entry.upvotes - 1)
        upvoted = False
    else:
        db.add(FeedbackUpvote(feedback_id=feedback_id, user_id=current_user.id))
        entry.upvotes += 1
        upvoted = True
    db.commit()
    return {"id": entry.id, "upvotes": entry.upvotes, "upvoted_by_me": upvoted}
