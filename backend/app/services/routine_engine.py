"""Constraint-based Intelligent Routine Generator (SRS 4.8)."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import CalendarEvent, QuizAttempt, RoutineBlock


def _fmt_hour(hour: int, minute: int = 0) -> str:
    suffix = "AM" if hour < 12 else "PM"
    display = hour % 12 or 12
    return f"{display:02d}:{minute:02d} {suffix}"


def build_adaptive_routine(
    db: Session,
    user_id: int,
    wake_hour: int = 7,
    sleep_hour: int = 23,
    focus_window: str = "morning",
    break_minutes: int = 15,
    study_hours_target: int = 4,
) -> list[RoutineBlock]:
    """
    Generate realistic Morning / Afternoon / Evening study blocks around fixed classes,
    urgent deadlines, focus windows, and weak quiz topics.
    """
    upcoming_events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == user_id,
            CalendarEvent.completed.is_(False),
            CalendarEvent.start_time >= datetime.now(timezone.utc),
        )
        .order_by(CalendarEvent.start_time.asc())
        .limit(4)
        .all()
    )

    recent_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.score_percent.asc())
        .limit(2)
        .all()
    )

    weak_course = recent_attempts[0].course_code if recent_attempts else "CSC301"
    top_deadline = upcoming_events[0] if upcoming_events else None
    second_deadline = upcoming_events[1] if len(upcoming_events) > 1 else None

    db.query(RoutineBlock).filter(RoutineBlock.user_id == user_id).delete()

    plan: list[dict[str, str]] = [
        {
            "period": "morning",
            "start": _fmt_hour(wake_hour + 1, 0),
            "end": _fmt_hour(wake_hour + 2, 15),
            "title": (
                f"Deep Focus: {top_deadline.title}"
                if top_deadline
                else f"Deep Focus: {weak_course} Core Concepts"
            ),
            "course": top_deadline.course_code if top_deadline else weak_course,
            "category": "deadline" if top_deadline else "study",
            "priority": "high" if focus_window == "morning" else "medium",
        },
        {
            "period": "morning",
            "start": _fmt_hour(wake_hour + 2, 15),
            "end": _fmt_hour(wake_hour + 2, 15 + min(break_minutes, 40)),
            "title": f"Recharge Break ({break_minutes} min hydration & stretch)",
            "course": "WELLNESS",
            "category": "break",
            "priority": "low",
        },
        {
            "period": "morning",
            "start": _fmt_hour(min(11, wake_hour + 3), 0),
            "end": _fmt_hour(min(12, wake_hour + 4), 15),
            "title": "Scheduled University Lecture & Lab Prep",
            "course": "CSC301",
            "category": "class",
            "priority": "high",
        },
        {
            "period": "afternoon",
            "start": "02:00 PM",
            "end": "03:30 PM",
            "title": (
                f"Guided Practice: {second_deadline.title}"
                if second_deadline
                else f"Remedial Quiz & Notes Review ({weak_course})"
            ),
            "course": second_deadline.course_code if second_deadline else weak_course,
            "category": "review",
            "priority": "high" if focus_window == "afternoon" else "medium",
        },
        {
            "period": "afternoon",
            "start": "04:00 PM",
            "end": "05:00 PM",
            "title": "Digitize Today's Lecture Notes & Run 5-Question Quiz",
            "course": "MAT201",
            "category": "study",
            "priority": "medium",
        },
        {
            "period": "evening",
            "start": "07:30 PM",
            "end": f"08:{45 if study_hours_target >= 4 else 30} PM",
            "title": f"Targeted Mastery Block — {weak_course} Weak Topics",
            "course": weak_course,
            "category": "study",
            "priority": "high" if focus_window == "evening" else "medium",
        },
        {
            "period": "evening",
            "start": _fmt_hour(max(20, sleep_hour - 2), 0),
            "end": _fmt_hour(max(20, sleep_hour - 2), 30),
            "title": "Tomorrow's Deadlines Check & Light Flashcard Recap",
            "course": "GENERAL",
            "category": "review",
            "priority": "low",
        },
    ]

    created: list[RoutineBlock] = []
    for item in plan:
        block = RoutineBlock(
            user_id=user_id,
            day_label="Today",
            period=item["period"],
            start_label=item["start"],
            end_label=item["end"],
            title=item["title"],
            course_code=item["course"],
            category=item["category"],
            priority=item["priority"],
            completed=False,
        )
        db.add(block)
        created.append(block)

    db.commit()
    for b in created:
        db.refresh(b)
    return created
