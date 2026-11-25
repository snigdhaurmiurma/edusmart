"""SQLAlchemy ORM models covering all EduSmart academic, AI, and admin domains."""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(140), nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(24), default="student", nullable=False)  # student | admin
    student_id: Mapped[str | None] = mapped_column(String(48), nullable=True)
    major: Mapped[str] = mapped_column(String(120), default="Computer Science & Engineering")
    trimester: Mapped[str] = mapped_column(String(60), default="Fall 2026 (Senior)")
    credits_completed: Mapped[int] = mapped_column(Integer, default=108)
    cgpa: Mapped[float | None] = mapped_column(Float, nullable=True, default=3.78)
    theme: Mapped[str] = mapped_column(String(16), default="light")

    # Privacy & consent controls (SRS 4.1, 4.2, 5.5)
    consent_rag_personal: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_ocr_processing: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_ucam_sync: Mapped[bool] = mapped_column(Boolean, default=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    digest_mode: Mapped[str] = mapped_column(String(24), default="instant")  # instant | daily

    # Security & lifecycle controls
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    notes: Mapped[list["Note"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    course_code: Mapped[str] = mapped_column(String(40), default="GEN101", index=True)
    tags: Mapped[str] = mapped_column(String(240), default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    source_filename: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.95)
    low_confidence_lines_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship(back_populates="notes")
    chunks: Mapped[list["RagChunk"]] = relationship(back_populates="note", cascade="all, delete-orphan")


class InstitutionalDoc(Base):
    __tablename__ = "institutional_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(60), default="policy")  # policy | faq | curriculum | research
    course_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    chunks: Mapped[list["RagChunk"]] = relationship(back_populates="institutional_doc", cascade="all, delete-orphan")


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)  # None => institutional public
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)  # note | institutional
    note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=True, index=True)
    institutional_doc_id: Mapped[int | None] = mapped_column(
        ForeignKey("institutional_docs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    course_code: Mapped[str] = mapped_column(String(40), default="GENERAL")
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    note: Mapped["Note | None"] = relationship(back_populates="chunks")
    institutional_doc: Mapped["InstitutionalDoc | None"] = relationship(back_populates="chunks")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    bot_type: Mapped[str] = mapped_column(String(24), index=True)  # uniq | advisor | research
    title: Mapped[str] = mapped_column(String(200), default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations_json: Mapped[str] = mapped_column(Text, default="[]")
    action_chips_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    course_code: Mapped[str] = mapped_column(String(40), default="GENERAL")
    difficulty: Mapped[str] = mapped_column(String(24), default="medium")
    timed_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    questions_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_code: Mapped[str] = mapped_column(String(40), default="GENERAL")
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    topic_breakdown_json: Mapped[str] = mapped_column(Text, default="{}")
    results_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), default="assignment")  # class | exam | assignment | study
    course_code: Mapped[str] = mapped_column(String(40), default="GENERAL")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="medium")  # high | medium | low
    reminder_minutes: Mapped[int] = mapped_column(Integer, default=60)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(24), default="manual")  # manual | ucam | elms | routine | ai
    external_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RoutineBlock(Base):
    __tablename__ = "routine_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day_label: Mapped[str] = mapped_column(String(24), default="Today")
    period: Mapped[str] = mapped_column(String(24), default="morning")  # morning | afternoon | evening
    start_label: Mapped[str] = mapped_column(String(16), nullable=False)
    end_label: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    course_code: Mapped[str] = mapped_column(String(40), default="GENERAL")
    category: Mapped[str] = mapped_column(String(32), default="study")  # class | study | review | break | deadline
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instructor: Mapped[str] = mapped_column(String(120), default="Faculty")
    credits: Mapped[int] = mapped_column(Integer, default=3)
    schedule: Mapped[str] = mapped_column(String(120), default="Sun/Tue 10:00 AM")
    status: Mapped[str] = mapped_column(String(24), default="enrolled")  # enrolled | completed
    grade: Mapped[str | None] = mapped_column(String(8), nullable=True)
    source: Mapped[str] = mapped_column(String(24), default="ucam")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_code: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending")  # pending | submitted | graded
    source: Mapped[str] = mapped_column(String(24), default="elms")
    external_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(24), nullable=False)  # ucam | elms | all
    status: Mapped[str] = mapped_column(String(24), default="success")
    items_synced: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FeedbackEntry(Base):
    __tablename__ = "feedback_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    author_name: Mapped[str] = mapped_column(String(140), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    category: Mapped[str] = mapped_column(String(32), default="Feature")  # Bug | Feature | General
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="open")  # open | planned | resolved | hidden
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FeedbackUpvote(Base):
    __tablename__ = "feedback_upvotes"
    __table_args__ = (UniqueConstraint("feedback_id", "user_id", name="uq_feedback_upvote"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feedback_id: Mapped[int] = mapped_column(ForeignKey("feedback_entries.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="system")  # reminder | quiz | sync | feedback | admin
    action_route: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_email: Mapped[str] = mapped_column(String(180), default="system")
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    target: Mapped[str] = mapped_column(String(180), default="")
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RagTelemetry(Base):
    __tablename__ = "rag_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bot_type: Mapped[str] = mapped_column(String(24), default="uniq")
    query_preview: Mapped[str] = mapped_column(String(160), default="")
    retrieval_k: Mapped[int] = mapped_column(Integer, default=4)
    hits_count: Mapped[int] = mapped_column(Integer, default=0)
    hit_at_1: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    provider: Mapped[str] = mapped_column(String(32), default="local-hybrid-rag")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
