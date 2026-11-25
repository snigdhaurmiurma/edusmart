"""UCAM & ELMS Institutional Sync service with idempotent deduplication (SRS 4.10)."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models import Assignment, CalendarEvent, Course, Notification, SyncLog


UCAM_CATALOG = [
    {
        "code": "CSC301",
        "title": "Algorithms & Data Structures",
        "instructor": "Dr. Arif Rahman",
        "credits": 3,
        "schedule": "Sun/Tue 10:00 AM - 11:30 AM",
        "status": "enrolled",
        "grade": None,
    },
    {
        "code": "MAT201",
        "title": "Linear Algebra & Differential Equations",
        "instructor": "Prof. Nusrat Jahan",
        "credits": 3,
        "schedule": "Mon/Wed 01:30 PM - 03:00 PM",
        "status": "enrolled",
        "grade": None,
    },
    {
        "code": "PHY101",
        "title": "Applied Physics & Instrumentation Lab",
        "instructor": "Dr. Tanvir Ahmed",
        "credits": 3,
        "schedule": "Thu 09:00 AM - 11:30 AM",
        "status": "enrolled",
        "grade": None,
    },
    {
        "code": "CSE3411",
        "title": "System Analysis & Design Lab",
        "instructor": "Farhana Akter",
        "credits": 3,
        "schedule": "Tue 02:00 PM - 04:30 PM",
        "status": "enrolled",
        "grade": None,
    },
    {
        "code": "CSE221",
        "title": "Operating Systems",
        "instructor": "Dr. Mahfuzul Karim",
        "credits": 3,
        "schedule": "Completed",
        "status": "completed",
        "grade": "A",
    },
    {
        "code": "CSE231",
        "title": "Computer Networks",
        "instructor": "Dr. Samira Chowdhury",
        "credits": 3,
        "schedule": "Completed",
        "status": "completed",
        "grade": "A-",
    },
]


def _elms_assignments() -> list[dict]:
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    return [
        {
            "external_ref": "elms-mat201-ps4",
            "course_code": "MAT201",
            "title": "MAT201 Problem Set 4",
            "event_type": "assignment",
            "priority": "high",
            "due_at": now + timedelta(days=1, hours=4),
        },
        {
            "external_ref": "elms-csc301-midterm",
            "course_code": "CSC301",
            "title": "CSC301 Midterm Exam",
            "event_type": "exam",
            "priority": "high",
            "due_at": now + timedelta(days=3, hours=2),
        },
        {
            "external_ref": "elms-phy101-lab",
            "course_code": "PHY101",
            "title": "PHY101 Lab Report",
            "event_type": "assignment",
            "priority": "medium",
            "due_at": now + timedelta(days=6, hours=3),
        },
        {
            "external_ref": "elms-cse3411-srs",
            "course_code": "CSE3411",
            "title": "CSE3411 Architecture Review Deck",
            "event_type": "assignment",
            "priority": "medium",
            "due_at": now + timedelta(days=8, hours=5),
        },
    ]


def run_sync(db: Session, user_id: int, provider: str = "all") -> SyncLog:
    items_synced = 0

    if provider in ("ucam", "all"):
        for c in UCAM_CATALOG:
            existing = (
                db.query(Course)
                .filter(Course.user_id == user_id, Course.code == c["code"])
                .first()
            )
            if not existing:
                db.add(Course(user_id=user_id, source="ucam", **c))
                items_synced += 1

    if provider in ("elms", "all"):
        for a in _elms_assignments():
            existing_a = (
                db.query(Assignment)
                .filter(Assignment.user_id == user_id, Assignment.external_ref == a["external_ref"])
                .first()
            )
            if not existing_a:
                db.add(
                    Assignment(
                        user_id=user_id,
                        course_code=a["course_code"],
                        title=a["title"],
                        due_at=a["due_at"],
                        status="pending",
                        source="elms",
                        external_ref=a["external_ref"],
                    )
                )
                items_synced += 1

            existing_ev = (
                db.query(CalendarEvent)
                .filter(CalendarEvent.user_id == user_id, CalendarEvent.external_ref == a["external_ref"])
                .first()
            )
            if not existing_ev:
                db.add(
                    CalendarEvent(
                        user_id=user_id,
                        title=a["title"],
                        event_type=a["event_type"],
                        course_code=a["course_code"],
                        start_time=a["due_at"],
                        end_time=a["due_at"] + timedelta(hours=1),
                        priority=a["priority"],
                        reminder_minutes=120,
                        source="elms",
                        external_ref=a["external_ref"],
                    )
                )

    log = SyncLog(
        user_id=user_id,
        provider=provider,
        status="success",
        items_synced=items_synced,
        message=f"Synced {provider.upper()} cleanly ({items_synced} new records reconciled).",
    )
    db.add(log)
    db.add(
        Notification(
            user_id=user_id,
            title=f"{provider.upper()} Sync Completed",
            message=f"Reconciled courses, assignments, and Smart Calendar deadlines ({items_synced} new items).",
            category="sync",
            action_route="sync",
        )
    )
    db.commit()
    db.refresh(log)
    return log
