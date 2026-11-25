"""End-to-end API & RAG integration tests for EduSmart (api/index.py)."""

import os
import sys
import tempfile
from pathlib import Path

_TEST_DB = Path(tempfile.gettempdir()) / f"edusmart_full_{os.getpid()}.db"
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


def test_public_live_rag_demo_and_support():
    rag = client.post("/api/public/rag-demo", json={"query": "How do merit scholarships and tuition waivers work?", "bot_type": "uniq"})
    assert rag.status_code == 200
    body = rag.json()
    assert body["corpus_chunks_scanned"] >= 1
    assert len(body["citations"]) >= 1
    assert "bm25_score" in body["citations"][0]
    assert "cosine_score" in body["citations"][0]
    assert "waiver" in body["answer"].lower() or "scholarship" in body["answer"].lower()

    sup = client.post("/api/public/support", json={"name": "Visitor", "email": "visitor@example.edu", "message": "Interested in campus pilot."})
    assert sup.status_code == 200


def test_cross_tenant_rag_isolation_index_inspector_and_purge():
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
        json={"title": "Private Study Draft", "course_code": "CSE499", "tags": "private", "content": f"Confidential thesis keyword: {secret} is used for distributed consensus."},
    )
    assert note.status_code == 201
    note_id = note.json()["id"]

    # RAG Index Inspector shows personal chunk
    idx = client.get("/api/rag/index", headers=second_headers)
    assert idx.status_code == 200
    assert idx.json()["personal_chunks_count"] >= 1

    # Owner retrieves their own note via Hybrid RAG
    own = client.post("/api/chat/message", headers=second_headers, json={"bot_type": "uniq", "message": secret, "source_scope": "personal"})
    assert own.status_code == 200
    assert any("Private Study Draft" in c["title"] for c in own.json()["message"]["citations"])

    # Another student MUST NOT retrieve it
    other = client.post("/api/chat/message", headers=student_headers, json={"bot_type": "uniq", "message": secret})
    assert other.status_code == 200
    assert all("Private Study Draft" not in c["title"] for c in other.json()["message"]["citations"])

    # Delete cascades vector purge
    deleted = client.delete(f"/api/notes/{note_id}", headers=second_headers)
    assert deleted.status_code == 200
    assert deleted.json()["purged_rag_chunks"] >= 1


def test_notes_ocr_pdf_custom_quiz_calendar_routine_assignments_and_admin():
    headers = _login("student@edusmart.edu", "Student@123")

    # OCR + PDF export
    up = client.post(
        "/api/notes/digitize",
        headers=headers,
        data={"title": "Algorithms Recap", "course_code": "CSC301"},
        files={"file": ("scan.png", b"\x89PNG\r\n\x1a\nsample", "image/png")},
    )
    assert up.status_code == 201
    assert client.get(f"/api/notes/{up.json()['id']}/export?fmt=pdf", headers=headers).content.startswith(b"%PDF-1.4")

    # Custom pasted text quiz + delete
    q = client.post(
        "/api/quizzes/generate",
        headers=headers,
        json={"custom_text": "- Consensus: Agreement among distributed nodes despite faults.", "course_code": "CSE415", "num_questions": 3},
    )
    assert q.status_code == 201
    ans = {item["id"]: (item["options"][0] if item["options"] else "consensus") for item in q.json()["questions"]}
    assert client.post(f"/api/quizzes/{q.json()['id']}/submit", headers=headers, json={"answers": ans}).status_code == 200
    assert client.delete(f"/api/quizzes/{q.json()['id']}", headers=headers).status_code == 200

    # Manual course + assignment toggle + routine custom block + push to calendar
    c = client.post("/api/sync/courses", headers=headers, json={"code": "CSE415", "title": "Distributed Systems", "credits": 3})
    assert c.status_code == 201
    a = client.post("/api/sync/assignments", headers=headers, json={"course_code": "CSE415", "title": "Raft Lab", "due_at": "2026-12-15T12:00:00Z"})
    assert a.status_code == 201
    assert client.patch(f"/api/sync/assignments/{a.json()['id']}/toggle", headers=headers).json()["status"] == "submitted"
    assert client.delete(f"/api/sync/courses/{c.json()['id']}", headers=headers).status_code == 200

    rb = client.post("/api/routine/blocks", headers=headers, json={"period": "evening", "start_label": "09:00 PM", "end_label": "09:45 PM", "title": "Raft Reading", "course_code": "CSE415"})
    assert rb.status_code == 201
    assert client.post("/api/routine/sync-calendar", headers=headers).status_code == 200

    # Admin RBAC, telemetry & policy publish/delete
    assert client.get("/api/admin/overview", headers=headers).status_code == 403
    admin_headers = _login("admin@edusmart.edu", "Admin@123")
    assert client.get("/api/admin/telemetry", headers=admin_headers).status_code == 200
    pub = client.post("/api/admin/content", headers=admin_headers, json={"title": "Lab Hours", "category": "policy", "content": "Computer labs stay open until 10 PM daily."})
    assert pub.status_code == 201
    assert client.delete(f"/api/admin/content/{pub.json()['id']}", headers=admin_headers).status_code == 200


def test_universal_university_setup_custom_rag_and_ics_import():
    # Custom university RAG demo on landing page
    custom_rag = client.post(
        "/api/public/rag-demo",
        json={
            "query": "What is the withdrawal deadline?",
            "bot_type": "uniq",
            "university_name": "Oxford Test College",
            "custom_context": "At Oxford Test College, midterm course withdrawal closes on Week 7 Friday and labs require 85% attendance.",
        },
    )
    assert custom_rag.status_code == 200
    assert "Week 7" in custom_rag.json()["answer"]

    headers = _login("student@edusmart.edu", "Student@123")

    # Save custom university info & index handbook into personal RAG
    uni = client.post(
        "/api/sync/university-info",
        headers=headers,
        json={
            "university_name": "Global Tech University",
            "lms_platform": "Canvas LMS",
            "handbook_title": "GTU Grading Rules",
            "handbook_text": "Dean's Honor Roll at Global Tech University requires GPA 3.80 with zero incomplete grades.",
        },
    )
    assert uni.status_code == 200
    assert uni.json()["chunks_indexed"] >= 1

    # Universal .ics calendar import
    ics_bytes = (
        "BEGIN:VCALENDAR\r\n"
        "BEGIN:VEVENT\r\n"
        "SUMMARY:CS202 Systems Midterm Exam\r\n"
        "DTSTART:20261220T100000Z\r\n"
        "DTEND:20261220T120000Z\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    ).encode("utf-8")
    imp = client.post("/api/sync/import-ics", headers=headers, files={"file": ("canvas.ics", ics_bytes, "text/calendar")})
    assert imp.status_code == 200
    assert imp.json()["imported"] == 1
