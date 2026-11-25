"""AI-Powered Quiz Generator, submission grading, and topic mastery tracking (SRS 4.6)."""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Note, Notification, Quiz, QuizAttempt, User
from app.schemas import QuizGenerateRequest, QuizSubmitRequest
from app.security import get_current_user
from app.services.quiz_engine import generate_questions, grade_quiz

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


def _serialize_quiz(q: Quiz) -> dict:
    questions = json.loads(q.questions_json or "[]")
    # Hide correct answer keys when serving quiz to attempt; still keep id, type, topic, prompt, options
    public_questions = [
        {
            "id": item["id"],
            "type": item["type"],
            "topic": item["topic"],
            "prompt": item["prompt"],
            "options": item.get("options", []),
        }
        for item in questions
    ]
    return {
        "id": q.id,
        "note_id": q.note_id,
        "title": q.title,
        "course_code": q.course_code,
        "difficulty": q.difficulty,
        "timed_minutes": q.timed_minutes,
        "questions": public_questions,
        "created_at": q.created_at.isoformat(),
    }


@router.get("")
def list_quizzes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quizzes = (
        db.query(Quiz)
        .filter(Quiz.user_id == current_user.id)
        .order_by(Quiz.created_at.desc())
        .all()
    )
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "quizzes": [_serialize_quiz(q) for q in quizzes],
        "attempts": [
            {
                "id": a.id,
                "quiz_id": a.quiz_id,
                "course_code": a.course_code,
                "score_percent": a.score_percent,
                "correct_count": a.correct_count,
                "total_questions": a.total_questions,
                "duration_seconds": a.duration_seconds,
                "topic_breakdown": json.loads(a.topic_breakdown_json or "{}"),
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
    }


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source_text = None
    course_code = payload.course_code.upper()
    title = f"{payload.topic or course_code} Practice Quiz"

    if payload.note_id:
        note = db.query(Note).filter(Note.id == payload.note_id, Note.user_id == current_user.id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Selected note not found.")
        source_text = note.content
        course_code = note.course_code
        title = f"{note.title} — Practice Quiz"

    questions = generate_questions(
        source_text=source_text,
        topic=payload.topic,
        course_code=course_code,
        num_questions=payload.num_questions,
        difficulty=payload.difficulty,
    )
    quiz = Quiz(
        user_id=current_user.id,
        note_id=payload.note_id,
        title=title,
        course_code=course_code,
        difficulty=payload.difficulty,
        timed_minutes=payload.timed_minutes,
        questions_json=json.dumps(questions),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return _serialize_quiz(quiz)


@router.post("/{quiz_id}/submit")
def submit_quiz(
    quiz_id: int,
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    questions = json.loads(quiz.questions_json or "[]")
    graded = grade_quiz(questions, payload.answers)

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        course_code=quiz.course_code,
        score_percent=graded["score_percent"],
        correct_count=graded["correct_count"],
        total_questions=graded["total_questions"],
        duration_seconds=payload.duration_seconds,
        topic_breakdown_json=json.dumps(graded["topic_breakdown"]),
        results_json=json.dumps(graded["results"]),
    )
    db.add(attempt)

    if graded["weak_topics"]:
        weak_str = ", ".join(graded["weak_topics"][:3])
        db.add(
            Notification(
                user_id=current_user.id,
                title=f"Quiz Review Suggested ({quiz.course_code})",
                message=(
                    f"You scored {graded['score_percent']:.0f}% on {quiz.title}. "
                    f"Consider a focused routine block for: {weak_str}."
                ),
                category="quiz",
                action_route="routine",
            )
        )
    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "quiz_title": quiz.title,
        "course_code": quiz.course_code,
        **graded,
    }
