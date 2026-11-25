"""End-to-end API integration tests covering EduSmart SRS functional & security requirements."""

import os
import sys
import tempfile
from pathlib import Path

# Use an isolated temporary SQLite database for every test run
_TEST_DB = Path(tempfile.gettempdir()) / f"edusmart_test_{os.getpid()}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _login(email: str, password: str) -> dict[str, str]:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_and_seeded_demo_login():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    headers = _login("student@edusmart.edu", "Student@123")
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["role"] == "student"


def test_cross_tenant_rag_isolation_and_cascade_purge():
    student_headers = _login("student@edusmart.edu", "Student@123")

    # Register a second isolated student user
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Second Student",
            "email": "isolated_student@edusmart.edu",
            "password": "Password123!",
        },
    )
    assert reg.status_code == 201
    second_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Second student creates a note containing a unique secret token
    secret_phrase = "QUANTUM_HYPERION_9942_SECRET"
    note_resp = client.post(
        "/api/notes",
        headers=second_headers,
        json={
            "title": "Private Thesis Draft",
            "course_code": "CSE499",
            "tags": "private",
            "content": f"Confidential thesis keyword: {secret_phrase} for tenant isolation verification.",
        },
    )
    assert note_resp.status_code == 201
    note_id = note_resp.json()["id"]

    # Second student CAN retrieve their own note via UNIQ RAG
    own_chat = client.post(
        "/api/chat/message",
        headers=second_headers,
        json={"bot_type": "uniq", "message": f"Tell me about {secret_phrase}"},
    )
    assert own_chat.status_code == 200
    own_citations = own_chat.json()["message"]["citations"]
    assert any("Private Thesis Draft" in c["title"] for c in own_citations)

    # First student MUST NOT see second student's note in RAG citations
    other_chat = client.post(
        "/api/chat/message",
        headers=student_headers,
        json={"bot_type": "uniq", "message": f"Tell me about {secret_phrase}"},
    )
    assert other_chat.status_code == 200
    other_citations = other_chat.json()["message"]["citations"]
    assert all("Private Thesis Draft" not in c["title"] for c in other_citations)

    # Deleting the note MUST cascade-purge its RAG chunks
    del_resp = client.delete(f"/api/notes/{note_id}", headers=second_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["purged_rag_chunks"] >= 1


def test_notes_digitizer_ocr_and_pdf_export():
    headers = _login("student@edusmart.edu", "Student@123")
    upload = client.post(
        "/api/notes/digitize",
        headers=headers,
        data={"title": "Graph Theory Lecture", "course_code": "CSC301", "tags": "graphs"},
        files={"file": ("lecture_notes.png", b"\x89PNG\r\n\x1a\nfake-image-payload", "image/png")},
    )
    assert upload.status_code == 201
    data = upload.json()
    assert data["chunks_indexed"] >= 1
    assert isinstance(data["low_confidence_lines"], list)

    pdf_resp = client.get(f"/api/notes/{data['id']}/export?fmt=pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"].startswith("application/pdf")
    assert pdf_resp.content.startswith(b"%PDF")


def test_quiz_generation_and_grading():
    headers = _login("student@edusmart.edu", "Student@123")
    gen = client.post(
        "/api/quizzes/generate",
        headers=headers,
        json={"course_code": "CSC301", "topic": "Dynamic Programming", "num_questions": 4, "difficulty": "medium"},
    )
    assert gen.status_code == 201
    quiz = gen.json()
    assert len(quiz["questions"]) == 4

    answers = {}
    for q in quiz["questions"]:
        answers[q["id"]] = q["options"][0] if q["options"] else "recursion caching"

    graded = client.post(
        f"/api/quizzes/{quiz['id']}/submit",
        headers=headers,
        json={"answers": answers, "duration_seconds": 95},
    )
    assert graded.status_code == 200
    body = graded.json()
    assert 0.0 <= body["score_percent"] <= 100.0
    assert len(body["results"]) == 4


def test_calendar_conflict_detection_resolution_and_ics_export():
    headers = _login("student@edusmart.edu", "Student@123")
    ev1 = client.post(
        "/api/calendar/events",
        headers=headers,
        json={
            "title": "Compiler Design Lecture",
            "event_type": "class",
            "course_code": "CSE401",
            "start_time": "2026-12-10T10:00:00Z",
            "end_time": "2026-12-10T11:30:00Z",
            "priority": "high",
        },
    )
    assert ev1.status_code == 201

    ev2 = client.post(
        "/api/calendar/events",
        headers=headers,
        json={
            "title": "Overlapping Study Slot",
            "event_type": "study",
            "course_code": "CSE401",
            "start_time": "2026-12-10T10:30:00Z",
            "end_time": "2026-12-10T11:30:00Z",
            "priority": "medium",
        },
    )
    assert ev2.status_code == 201
    assert len(ev2.json()["conflicts"]) >= 1

    ev2_id = ev2.json()["event"]["id"]
    resolved = client.post(f"/api/calendar/events/{ev2_id}/resolve", headers=headers)
    assert resolved.status_code == 200
    assert resolved.json()["start_time"] != "2026-12-10T10:30:00+00:00"

    ics = client.get("/api/calendar/export.ics", headers=headers)
    assert ics.status_code == 200
    assert "BEGIN:VCALENDAR" in ics.text


def test_routine_sync_feedback_analytics_and_gdpr():
    headers = _login("student@edusmart.edu", "Student@123")

    routine = client.post(
        "/api/routine/generate",
        headers=headers,
        json={"wake_hour": 7, "sleep_hour": 23, "focus_window": "morning", "break_minutes": 15, "study_hours_target": 4},
    )
    assert routine.status_code == 200
    assert len(routine.json()["blocks"]) >= 5

    sync_res = client.post("/api/sync/trigger?provider=all", headers=headers)
    assert sync_res.status_code == 200

    fb = client.post(
        "/api/feedback",
        headers=headers,
        json={"rating": 5, "category": "Feature", "message": "Great integrated workspace for exam prep!"},
    )
    assert fb.status_code == 201

    csv_resp = client.get("/api/analytics/export.csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "Score (%)" in csv_resp.text

    gdpr = client.get("/api/auth/export", headers=headers)
    assert gdpr.status_code == 200
    assert gdpr.json()["profile"]["email"] == "student@edusmart.edu"


def test_admin_rbac_and_policy_publishing():
    student_headers = _login("student@edusmart.edu", "Student@123")
    forbidden = client.get("/api/admin/overview", headers=student_headers)
    assert forbidden.status_code == 403

    admin_headers = _login("admin@edusmart.edu", "Admin@123")
    overview = client.get("/api/admin/overview", headers=admin_headers)
    assert overview.status_code == 200
    assert "kpis" in overview.json()

    pub = client.post(
        "/api/admin/content",
        headers=admin_headers,
        json={
            "title": "Library 24/7 Exam Week Hours",
            "category": "policy",
            "content": "During final exam weeks the main university library remains open 24 hours with quiet study pods.",
        },
    )
    assert pub.status_code == 201
    assert pub.json()["chunks_indexed"] >= 1
