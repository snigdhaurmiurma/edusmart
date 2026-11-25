"""Smart Academic Calendar with overlap conflict detection, 1-click resolution, and .ics export (SRS 4.7)."""

from datetime import timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CalendarEvent, User
from app.schemas import CalendarEventCreate, CalendarEventUpdate
from app.security import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _ensure_utc(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _find_conflicts(events: list[CalendarEvent]) -> list[dict]:
    ordered = sorted(events, key=lambda e: _ensure_utc(e.start_time))
    conflicts: list[dict] = []
    for i in range(len(ordered)):
        a = ordered[i]
        a_start, a_end = _ensure_utc(a.start_time), _ensure_utc(a.end_time)
        for j in range(i + 1, len(ordered)):
            b = ordered[j]
            b_start, b_end = _ensure_utc(b.start_time), _ensure_utc(b.end_time)
            if b_start < a_end and a_start < b_end:
                suggested_start = a_end + timedelta(minutes=15)
                suggested_end = suggested_start + (b_end - b_start)
                conflicts.append(
                    {
                        "event_a_id": a.id,
                        "event_a_title": a.title,
                        "event_b_id": b.id,
                        "event_b_title": b.title,
                        "suggested_start": suggested_start.isoformat(),
                        "suggested_end": suggested_end.isoformat(),
                    }
                )
    return conflicts


def _serialize_event(ev: CalendarEvent) -> dict:
    return {
        "id": ev.id,
        "title": ev.title,
        "event_type": ev.event_type,
        "course_code": ev.course_code,
        "start_time": _ensure_utc(ev.start_time).isoformat(),
        "end_time": _ensure_utc(ev.end_time).isoformat(),
        "priority": ev.priority,
        "reminder_minutes": ev.reminder_minutes,
        "completed": ev.completed,
        "source": ev.source,
    }


@router.get("/events")
def list_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id)
        .order_by(CalendarEvent.start_time.asc())
        .all()
    )
    active_events = [e for e in events if not e.completed]
    return {
        "events": [_serialize_event(e) for e in events],
        "conflicts": _find_conflicts(active_events),
    }


@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start = _ensure_utc(payload.start_time)
    end = _ensure_utc(payload.end_time)
    if end <= start:
        end = start + timedelta(hours=1)

    ev = CalendarEvent(
        user_id=current_user.id,
        title=payload.title.strip(),
        event_type=payload.event_type,
        course_code=payload.course_code.strip().upper(),
        start_time=start,
        end_time=end,
        priority=payload.priority,
        reminder_minutes=payload.reminder_minutes,
        source="manual",
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    all_active = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id, CalendarEvent.completed.is_(False))
        .all()
    )
    return {"event": _serialize_event(ev), "conflicts": _find_conflicts(all_active)}


@router.put("/events/{event_id}")
def update_event(
    event_id: int,
    payload: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field in ("start_time", "end_time") and val is not None:
            val = _ensure_utc(val)
        setattr(ev, field, val)
    db.commit()
    db.refresh(ev)
    return _serialize_event(ev)


@router.post("/events/{event_id}/resolve")
def resolve_conflict(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Automatically move a conflicting event to the next free 15-minute-buffered slot."""
    target = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Calendar event not found.")

    others = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == current_user.id,
            CalendarEvent.id != event_id,
            CalendarEvent.completed.is_(False),
        )
        .order_by(CalendarEvent.start_time.asc())
        .all()
    )

    duration = _ensure_utc(target.end_time) - _ensure_utc(target.start_time)
    candidate_start = _ensure_utc(target.start_time)
    for other in others:
        o_start, o_end = _ensure_utc(other.start_time), _ensure_utc(other.end_time)
        candidate_end = candidate_start + duration
        if candidate_start < o_end and o_start < candidate_end:
            candidate_start = o_end + timedelta(minutes=15)

    target.start_time = candidate_start
    target.end_time = candidate_start + duration
    db.commit()
    db.refresh(target)
    return _serialize_event(target)


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    db.delete(ev)
    db.commit()
    return {"deleted": True}


@router.get("/export.ics")
def export_ics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id)
        .order_by(CalendarEvent.start_time.asc())
        .all()
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EduSmart//Academic Calendar//EN",
    ]
    for ev in events:
        dtstart = _ensure_utc(ev.start_time).strftime("%Y%m%dT%H%M%SZ")
        dtend = _ensure_utc(ev.end_time).strftime("%Y%m%dT%H%M%SZ")
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:edusmart-{ev.id}@edusmart.edu",
                f"DTSTART:{dtstart}",
                f"DTEND:{dtend}",
                f"SUMMARY:[{ev.course_code}] {ev.title}",
                f"CATEGORIES:{ev.event_type.upper()}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    ics_payload = "\r\n".join(lines) + "\r\n"
    return Response(
        content=ics_payload.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="edusmart-calendar.ics"'},
    )
