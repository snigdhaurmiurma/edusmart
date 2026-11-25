"""In-App Notification Center router (SRS 4.11)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notification, User
from app.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    unread_count = sum(1 for n in items if not n.is_read)
    return {
        "unread_count": unread_count,
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "action_route": n.action_route,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
    }


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Notification)
        .filter(Notification.id == notif_id, Notification.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item.is_read = True
    db.commit()
    return {"id": item.id, "is_read": True}


@router.post("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()
    return {"marked_all_read": True}
