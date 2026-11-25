"""End-to-end API integration tests for the unified api/index.py EduSmart backend."""

import os
import sys
import tempfile
from pathlib import Path

_TEST_DB = Path(tempfile.gettempdir()) / f"edusmart_unified_{os.getpid()}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from api.index import app  # noqa: E402

client = TestClient(app)


def _login(email: str, password: str) -> dict[str, str]:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_health_and_authentic_student_profile():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    headers = _login("student@edusmart.edu", "Student@123")
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["full_name"] == "Urmi Urma Snigdha"


def test_cross_tenant_rag_isolation_and_cascade_purge():
    student_headers = _login("student@edusmart.edu", "Student@123")
    reg = client.post(
        "/api/auth/register",
        json={"full_name": "Test Learner", "email": "learner_iso@edusmart.edu", "password": "Password123!"},
    )
    assert reg.status_code == 201
    second_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    secret = "UNIQUE_TENANT_KEY_7731"
    note = client.post(
        "/api/notes",
        headers=second_headers,
        json={"title": "Private Study Draft", "course_code": "CSE499", "tags": "private", "content": f"Secret concept: {secret}"},
    )
    assert note.status_code == 201
    note_id = note.json()["id"]

    own = client.post("/api/chat/message", headers=second_headers, json={"bot_type": "uniq", "message": secret})
    assert own.status_code == 200
    assert any("Private Study Draft" in c["title"] for c in own.json()["message"]["citations"])

    other = client.post("/api/chat/message", headers=student_headers, json={"bot_type": "uniq", "message": secret})
    assert other.status_code == 200
    assert all("Private Study Draft" not in c["title"] for c in other.json()["message"]["citations"])

    deleted = client.delete(f"/api/notes/{note_id}", headers=second_headers)
    assert deleted.status_code == 200
    assert deleted.json()["purged_rag_chunks"] >= 1


def test_notes_digitizer_ocr_and_pure_python_pdf_export():
    headers = _login("student@edusmart.edu", "Student@123")
    up = client.post(
        "/api/notes/digitize",
        headers=headers,
        data={"title": "Algorithms Recap", "course_code": "CSC301", "tags": "algo"},
        files={"file": ("scan.png", b"\x89PNG\r\n\x1a\nsample", "image/png")},
    )
    assert up.status_code == 201
    pdf = client.get(f"/api/notes/{up.json()['id']}/export?fmt=pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF-1.4")


def test_quiz_calendar_courses_routine_and_admin_rbac():
    headers = _login("student@edusmart.edu", "Student@123")

    # Add & delete manual course
    c = client.post("/api/sync/courses", headers=headers, json={"code": "CSE415", "title": "Distributed Systems", "credits": 3})
    assert c.status_code == 201
    assert client.delete(f"/api/sync/courses/{c.json()['id']}", headers=headers).status_code == 200

    # Quiz generate + submit
    q = client.post("/api/quizzes/generate", headers=headers, json={"course_code": "CSC301", "num_questions": 3})
    assert q.status_code == 201
    ans = {item["id"]: (item["options"][0] if item["options"] else "recursion") for item in q.json()["questions"]}
    g = client.post(f"/api/quizzes/{q.json()['id']}/submit", headers=headers, json={"answers": ans})
    assert g.status_code == 200

    # Calendar conflict + auto-resolve + .ics
    e1 = client.post("/api/calendar/events", headers=headers, json={"title": "Class A", "event_type": "class", "course_code": "CSE401", "start_time": "2026-12-12T10:00:00Z", "end_time": "2026-12-12T11:30:00Z"})
    e2 = client.post("/api/calendar/events", headers=headers, json={"title": "Study B", "event_type": "study", "course_code": "CSE401", "start_time": "2026-12-12T10:30:00Z", "end_time": "2026-12-12T11:30:00Z"})
    assert e1.status_code == 201 and e2.status_code == 201
    assert len(e2.json()["conflicts"]) >= 1
    assert client.post(f"/api/calendar/events/{e2.json()['event']['id']}/resolve", headers=headers).status_code == 200
    assert "BEGIN:VCALENDAR" in client.get("/api/calendar/export.ics", headers=headers).text

    # RBAC check & live admin metrics
    assert client.get("/api/admin/overview", headers=headers).status_code == 403
    admin_headers = _login("admin@edusmart.edu", "Admin@123")
    ov = client.get("/api/admin/overview", headers=admin_headers)
    assert ov.status_code == 200
    assert ov.json()["kpis"]["total_users"] < 100  # Real live DB count, not mocked 2450
