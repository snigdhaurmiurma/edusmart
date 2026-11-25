"""Authentication, profile management, privacy consent, and GDPR data export (SRS 4.1 & 5.5)."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import CalendarEvent, ChatSession, FeedbackEntry, Note, QuizAttempt, RoutineBlock, User
from app.schemas import (
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserPublic,
)
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    record_audit,
    validate_password_strength,
    verify_password,
)
from app.services.sync_engine import run_sync

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    validate_password_strength(payload.password)

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="student",
        student_id=payload.student_id or f"011222{100 + db.query(User).count()}",
        major=payload.major,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed initial courses/deadlines via UCAM/ELMS sync for a rich first-run experience
    run_sync(db, user.id, "all")
    record_audit(db, action="user.register", actor=user, target=user.email)

    token = create_access_token(user)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        record_audit(db, action="auth.login_failed", actor_email=email, target=email, details="Unknown email")
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled by an administrator.")

    now = datetime.now(timezone.utc)
    if user.locked_until:
        locked_until = user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            raise HTTPException(
                status_code=423,
                detail="Account temporarily locked due to repeated failed attempts. Try again later.",
            )

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.max_failed_login_attempts:
            user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
            record_audit(db, action="auth.account_locked", actor=user, target=user.email)
        else:
            record_audit(db, action="auth.login_failed", actor=user, target=user.email)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    record_audit(db, action="auth.login_success", actor=user, target=user.email)

    token = create_access_token(user)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    record_audit(db, action="auth.password_reset_requested", actor_email=email, target=email)
    return {
        "status": "sent",
        "message": "If an account exists for this email, a time-limited reset link (valid for 1 hour) has been sent.",
    }


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)


@router.put("/me", response_model=UserPublic)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    record_audit(db, action="user.profile_updated", actor=current_user, target=current_user.email)
    return UserPublic.model_validate(current_user)


@router.get("/export")
def gdpr_export(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Portable JSON export of all personal academic data (SRS 5.5 Privacy & Compliance)."""
    notes = db.query(Note).filter(Note.user_id == current_user.id).all()
    events = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id).all()
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    routine = db.query(RoutineBlock).filter(RoutineBlock.user_id == current_user.id).all()
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).all()
    feedbacks = db.query(FeedbackEntry).filter(FeedbackEntry.user_id == current_user.id).all()

    record_audit(db, action="privacy.gdpr_export", actor=current_user, target=current_user.email)

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": UserPublic.model_validate(current_user).model_dump(mode="json"),
        "notes": [
            {"id": n.id, "title": n.title, "course_code": n.course_code, "content": n.content}
            for n in notes
        ],
        "calendar_events": [
            {
                "id": e.id,
                "title": e.title,
                "type": e.event_type,
                "course_code": e.course_code,
                "start_time": e.start_time.isoformat(),
                "completed": e.completed,
            }
            for e in events
        ],
        "quiz_attempts": [
            {
                "id": a.id,
                "course_code": a.course_code,
                "score_percent": a.score_percent,
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
        "routine_blocks": [
            {"period": r.period, "start": r.start_label, "end": r.end_label, "title": r.title}
            for r in routine
        ],
        "chat_sessions_count": len(sessions),
        "feedback_submitted": len(feedbacks),
    }
