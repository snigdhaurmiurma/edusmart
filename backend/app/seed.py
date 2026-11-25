"""Idempotent database seeding for instant Demo Student & Demo Admin exploration."""

import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models import (
    AuditLog,
    CalendarEvent,
    FeedbackEntry,
    InstitutionalDoc,
    Note,
    Notification,
    Quiz,
    QuizAttempt,
    User,
)
from app.security import hash_password
from app.services.quiz_engine import generate_questions
from app.services.rag import index_institutional_doc, index_note
from app.services.routine_engine import build_adaptive_routine
from app.services.sync_engine import run_sync


def seed_demo_data(db: Session) -> None:
    """Populate realistic pre-seeded student, admin, notes, policies, quizzes, calendar, and feedback."""
    if db.query(User).filter(User.email == "student@edusmart.edu").first():
        return

    student = User(
        full_name="Hasin Ishraq",
        email="student@edusmart.edu",
        password_hash=hash_password("Student@123"),
        role="student",
        student_id="011222058",
        major="Computer Science & Engineering",
        trimester="Fall 2026 (Senior)",
        credits_completed=114,
        cgpa=3.84,
    )
    admin = User(
        full_name="Urmi Urma Snigdha",
        email="admin@edusmart.edu",
        password_hash=hash_password("Admin@123"),
        role="admin",
        student_id="ADMIN-001",
        major="Academic Systems Administration",
        trimester="Faculty / Ops",
        credits_completed=138,
        cgpa=3.95,
    )
    db.add_all([student, admin])
    db.commit()
    db.refresh(student)
    db.refresh(admin)

    # Institutional policies & FAQs (public RAG knowledge base)
    policies = [
        InstitutionalDoc(
            title="University Scholarship & Tuition Waiver Policy",
            category="policy",
            course_code="POLICY",
            content=(
                "Merit Scholarships: Students maintaining a CGPA of 3.85 or above with at least 12 credits "
                "per trimester receive a 50% tuition waiver; CGPA 3.70–3.84 qualifies for a 25% waiver. "
                "Applications are automatically evaluated via UCAM within two weeks of grade publication. "
                "Need-based financial aid and installment loans can be requested at the Student Affairs desk."
            ),
            created_by=admin.id,
        ),
        InstitutionalDoc(
            title="CSE Degree Audit & Prerequisite Chain Guide",
            category="curriculum",
            course_code="CSE",
            content=(
                "The B.Sc. in Computer Science & Engineering requires 138 credits including core courses: "
                "CSC301 Algorithms (prereq: Data Structures), CSE221 Operating Systems, CSE231 Computer Networks, "
                "CSE3411 System Analysis & Design Lab, and CSE499A/B Capstone Design Project. "
                "Students with 105+ credits are eligible to register for 400-level technical electives."
            ),
            created_by=admin.id,
        ),
        InstitutionalDoc(
            title="Academic Integrity, Exam Deferral & Citation Standards",
            category="faq",
            course_code="RESEARCH",
            content=(
                "All undergraduate research papers and CSE499 capstone reports must follow IEEE citation style. "
                "Students unable to attend a midterm due to documented medical emergencies must file a makeup "
                "request through UCAM within 72 hours of the exam."
            ),
            created_by=admin.id,
        ),
    ]
    for doc in policies:
        db.add(doc)
    db.commit()
    for doc in policies:
        db.refresh(doc)
        index_institutional_doc(db, doc)

    # Student digitized notes
    notes = [
        Note(
            user_id=student.id,
            title="CSC301 — Dynamic Programming & Shortest Paths",
            course_code="CSC301",
            tags="algorithms,dp,graphs,midterm",
            source_filename="csc301_week6_handwritten.png",
            ocr_confidence=0.93,
            low_confidence_lines_json=json.dumps(
                [
                    {
                        "line_number": 7,
                        "text": "Recurrence: dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w-wt[i]])",
                        "confidence": 0.76,
                        "suggestion": "Double-check base condition when w < wt[i].",
                    }
                ]
            ),
            summary=(
                "Covers optimal substructure, overlapping subproblems, top-down memoization vs bottom-up "
                "tabulation, 0/1 Knapsack recurrence, and Dijkstra O((V+E) log V) shortest paths."
            ),
            content=(
                "# CSC301 Lecture 06: Dynamic Programming & Graphs\n\n"
                "- **Optimal Substructure:** An optimal solution can be built cleanly from optimal solutions to subproblems.\n"
                "- **Overlapping Subproblems:** Recursive sub-calls repeat identical states, making caching (memoization) essential.\n"
                "- **0/1 Knapsack Recurrence:** dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w-wt[i]]) when wt[i] <= w.\n"
                "- **Dijkstra's Algorithm:** Uses a binary min-heap priority queue achieving O((V + E) log V) for non-negative edge weights.\n"
                "- **Master Theorem Reminder:** T(n) = 2T(n/2) + O(n) resolves to O(n log n) under Case 2."
            ),
        ),
        Note(
            user_id=student.id,
            title="MAT201 — Eigenvalues, Rank-Nullity & Orthogonality",
            course_code="MAT201",
            tags="linear-algebra,matrices,problem-set",
            source_filename="mat201_eigen_notes.pdf",
            ocr_confidence=0.96,
            low_confidence_lines_json="[]",
            summary="Key linear algebra theorems for Problem Set 4: invertibility, eigenvalues, Rank-Nullity, and orthogonal projection.",
            content=(
                "# MAT201 Study Sheet: Eigenvalues & Linear Transformations\n\n"
                "- **Invertibility Criterion:** An n x n square matrix A is invertible if and only if det(A) != 0.\n"
                "- **Eigenvalue Equation:** A v = lambda v for nonzero eigenvector v; find lambda via det(A - lambda I) = 0.\n"
                "- **Rank-Nullity Theorem:** For an m x n matrix A, rank(A) + nullity(A) = n.\n"
                "- **Orthogonal Vectors:** Two vectors u and v are orthogonal when their dot product u · v = 0."
            ),
        ),
        Note(
            user_id=student.id,
            title="PHY101 — Oscillations & Sensor Calibration Lab",
            course_code="PHY101",
            tags="physics,lab-report,error-analysis",
            source_filename="phy101_lab4.jpg",
            ocr_confidence=0.91,
            low_confidence_lines_json="[]",
            summary="Experimental setup, damped harmonic motion formulas, and uncertainty propagation for Lab Report 4.",
            content=(
                "# PHY101 Lab 4: Damped Harmonic Motion\n\n"
                "- **Natural Frequency:** omega_0 = sqrt(k / m) determines undamped oscillation rate.\n"
                "- **Uncertainty Propagation:** Combine systematic sensor resolution with repeated-trial standard error.\n"
                "- **Report Checklist:** Include raw table, fitted decay curve, and percent discrepancy discussion."
            ),
        ),
    ]
    for n in notes:
        db.add(n)
    db.commit()
    for n in notes:
        db.refresh(n)
        index_note(db, n)

    # Sync UCAM + ELMS courses, assignments, and Smart Calendar deadlines
    run_sync(db, student.id, "all")

    # Add an extra study session to make the calendar rich
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    db.add(
        CalendarEvent(
            user_id=student.id,
            title="CSC301 Algorithm Study Group",
            event_type="study",
            course_code="CSC301",
            start_time=now + timedelta(days=2, hours=5),
            end_time=now + timedelta(days=2, hours=7),
            priority="medium",
            reminder_minutes=60,
            source="manual",
        )
    )
    db.commit()

    # Seed quizzes & attempts for rich analytics & mastery insights
    q1_questions = generate_questions(notes[0].content, "Dynamic Programming", "CSC301", 5, "medium")
    q1 = Quiz(
        user_id=student.id,
        note_id=notes[0].id,
        title="CSC301 — Dynamic Programming & Graphs Practice",
        course_code="CSC301",
        difficulty="medium",
        timed_minutes=10,
        questions_json=json.dumps(q1_questions),
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    db.add_all(
        [
            QuizAttempt(
                quiz_id=q1.id,
                user_id=student.id,
                course_code="MAT201",
                score_percent=85.0,
                correct_count=4,
                total_questions=5,
                duration_seconds=215,
                topic_breakdown_json=json.dumps({"Linear Algebra": 100.0, "Eigenvalues": 70.0}),
                results_json="[]",
            ),
            QuizAttempt(
                quiz_id=q1.id,
                user_id=student.id,
                course_code="CSC301",
                score_percent=65.0,
                correct_count=3,
                total_questions=5,
                duration_seconds=290,
                topic_breakdown_json=json.dumps({"Dynamic Programming": 60.0, "Graph Algorithms": 70.0}),
                results_json="[]",
            ),
            QuizAttempt(
                quiz_id=q1.id,
                user_id=student.id,
                course_code="PHY101",
                score_percent=90.0,
                correct_count=4,
                total_questions=5,
                duration_seconds=180,
                topic_breakdown_json=json.dumps({"Error Analysis": 90.0}),
                results_json="[]",
            ),
        ]
    )
    db.commit()

    # Build adaptive daily routine
    build_adaptive_routine(db, student.id)

    # Community feedback entries
    db.add_all(
        [
            FeedbackEntry(
                user_id=student.id,
                author_name="Moniza Hossain",
                rating=5,
                category="Feature",
                message="Converting lecture whiteboard photos straight into practice quizzes cut my midterm prep time in half!",
                status="planned",
                upvotes=24,
            ),
            FeedbackEntry(
                user_id=student.id,
                author_name="Sumiya Ahasan",
                rating=5,
                category="General",
                message="Having UNIQ, Advisor, and Research bots alongside our UCAM deadlines in one workspace is so much cleaner.",
                status="resolved",
                upvotes=18,
            ),
            FeedbackEntry(
                user_id=student.id,
                author_name="Sarah Johnson",
                rating=4,
                category="Feature",
                message="Would love Bangla OCR support for handwritten bilingual engineering notes in the next milestone.",
                status="open",
                upvotes=15,
            ),
        ]
    )

    db.add(
        Notification(
            user_id=student.id,
            title="Upcoming Exam Alert: CSC301 Midterm",
            message="Your CSC301 Midterm Exam is coming up in 3 days. Start a 5-question practice quiz or review your digitized DP notes.",
            category="reminder",
            action_route="quizzes",
        )
    )
    db.add(
        AuditLog(
            actor_user_id=admin.id,
            actor_email=admin.email,
            action="system.initialized",
            target="edusmart",
            details="Seeded institutional RAG policies and demo workspace",
        )
    )
    db.commit()
