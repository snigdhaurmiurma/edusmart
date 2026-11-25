"""Pydantic v2 request and response schemas for EduSmart API."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ---------- Auth & Profile ----------
class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=140)
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=8, max_length=128)
    student_id: str | None = None
    major: str = "Computer Science & Engineering"


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    student_id: str | None = None
    major: str | None = None
    trimester: str | None = None
    credits_completed: int | None = None
    cgpa: float | None = None
    theme: str | None = None
    consent_rag_personal: bool | None = None
    consent_ocr_processing: bool | None = None
    consent_ucam_sync: bool | None = None
    email_notifications: bool | None = None
    digest_mode: str | None = None


class UserPublic(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    student_id: str | None
    major: str
    trimester: str
    credits_completed: int
    cgpa: float | None
    theme: str
    consent_rag_personal: bool
    consent_ocr_processing: bool
    consent_ucam_sync: bool
    email_notifications: bool
    digest_mode: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------- Chat & RAG ----------
class ChatRequest(BaseModel):
    bot_type: str = Field(default="uniq", pattern="^(uniq|advisor|research)$")
    message: str = Field(min_length=1, max_length=4000)
    session_id: int | None = None
    use_personal_notes: bool = True


class CitationOut(BaseModel):
    chunk_id: int
    title: str
    source_type: str
    course_code: str
    score: float
    excerpt: str


class ActionChipOut(BaseModel):
    label: str
    action: str  # add_calendar | seed_routine | generate_quiz | open_sync | open_notes
    payload: dict[str, Any] = Field(default_factory=dict)


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    citations: list[CitationOut] = Field(default_factory=list)
    action_chips: list[ActionChipOut] = Field(default_factory=list)
    created_at: datetime


class ChatSessionOut(BaseModel):
    id: int
    bot_type: str
    title: str
    updated_at: datetime


# ---------- Notes Digitizer ----------
class NoteCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    course_code: str = "GEN101"
    tags: str = ""
    content: str = Field(min_length=1)


class NoteUpdateRequest(BaseModel):
    title: str | None = None
    course_code: str | None = None
    tags: str | None = None
    content: str | None = None


class LowConfidenceLine(BaseModel):
    line_number: int
    text: str
    confidence: float
    suggestion: str


class NoteOut(BaseModel):
    id: int
    title: str
    course_code: str
    tags: str
    content: str
    summary: str
    source_filename: str | None
    ocr_confidence: float
    low_confidence_lines: list[LowConfidenceLine] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ---------- Quizzes ----------
class QuizGenerateRequest(BaseModel):
    note_id: int | None = None
    topic: str | None = None
    course_code: str = "GENERAL"
    num_questions: int = Field(default=5, ge=2, le=10)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    timed_minutes: int | None = None


class QuizSubmitRequest(BaseModel):
    answers: dict[str, str]
    duration_seconds: int = 0


# ---------- Calendar ----------
class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    event_type: str = Field(default="assignment", pattern="^(class|exam|assignment|study)$")
    course_code: str = "GENERAL"
    start_time: datetime
    end_time: datetime
    priority: str = Field(default="medium", pattern="^(high|medium|low)$")
    reminder_minutes: int = 60


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    course_code: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    priority: str | None = None
    reminder_minutes: int | None = None
    completed: bool | None = None


# ---------- Routine ----------
class RoutineGenerateRequest(BaseModel):
    wake_hour: int = Field(default=7, ge=4, le=12)
    sleep_hour: int = Field(default=23, ge=18, le=24)
    focus_window: str = Field(default="morning", pattern="^(morning|afternoon|evening)$")
    break_minutes: int = Field(default=15, ge=5, le=45)
    study_hours_target: int = Field(default=4, ge=1, le=10)


# ---------- Feedback ----------
class FeedbackCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    category: str = Field(default="Feature", pattern="^(Bug|Feature|General)$")
    message: str = Field(min_length=5, max_length=2000)


# ---------- Admin ----------
class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    role: str | None = Field(default=None, pattern="^(student|admin)$")


class InstitutionalDocCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    category: str = Field(default="policy", pattern="^(policy|faq|curriculum|research)$")
    course_code: str | None = None
    content: str = Field(min_length=10)


class BroadcastRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=5, max_length=1500)


class FeedbackTriageRequest(BaseModel):
    status: str = Field(pattern="^(open|planned|resolved|hidden)$")
