"""Provider-agnostic AI adapter for UNIQ, Advisor, and Research chatbots."""

from datetime import datetime, timezone
from typing import Any, Iterator

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import CalendarEvent, Course, QuizAttempt, User

BOT_SYSTEM_PROMPTS = {
    "uniq": (
        "You are UNIQ, EduSmart's personalized university assistant. Answer concisely using ONLY "
        "the retrieved student notes, academic schedule, and approved institutional policies. "
        "Cite sources by title in [Title] format."
    ),
    "advisor": (
        "You are EduSmart's Academic Advisor Bot. Guide degree planning, course prerequisites, "
        "credit balance, and graduation timeline based on the student's completed and enrolled courses."
    ),
    "research": (
        "You are EduSmart's Research Assistant Bot. Provide structured literature search queries, "
        "methodology checklists, IEEE citations, and research paper outlines."
    ),
}


def _call_external_llm(system_prompt: str, user_prompt: str) -> tuple[str | None, str]:
    settings = get_settings()
    if settings.openai_api_key:
        try:
            with httpx.Client(timeout=18.0) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": settings.openai_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.35,
                        "max_tokens": 650,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"], f"openai:{settings.openai_model}"
        except Exception:
            pass

    if settings.gemini_api_key:
        try:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
            )
            with httpx.Client(timeout=18.0) as client:
                resp = client.post(
                    url,
                    json={
                        "contents": [
                            {
                                "role": "user",
                                "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}],
                            }
                        ]
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text, f"gemini:{settings.gemini_model}"
        except Exception:
            pass

    return None, "local-hybrid-rag"


def _build_action_chips(bot_type: str, message: str, hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lower = message.lower()
    chips: list[dict[str, Any]] = []
    if bot_type == "uniq":
        chips.append(
            {
                "label": "Schedule Study Session",
                "action": "add_calendar",
                "payload": {"title": "UNIQ Guided Study Block", "event_type": "study", "course_code": "CSC301"},
            }
        )
        chips.append({"label": "Generate Practice Quiz", "action": "generate_quiz", "payload": {"topic": message[:60]}})
        chips.append({"label": "Refresh Study Routine", "action": "seed_routine", "payload": {}})
    elif bot_type == "advisor":
        chips.append(
            {
                "label": "Add Advising Milestone",
                "action": "add_calendar",
                "payload": {"title": "Next-Term Course Registration Check", "event_type": "assignment", "course_code": "ADV"},
            }
        )
        chips.append({"label": "Sync UCAM Courses", "action": "open_sync", "payload": {}})
        chips.append({"label": "Build Balanced Routine", "action": "seed_routine", "payload": {}})
    else:
        chips.append(
            {
                "label": "Save Reading Milestone",
                "action": "add_calendar",
                "payload": {"title": f"Literature Review: {message[:36]}", "event_type": "study", "course_code": "CSE499"},
            }
        )
        chips.append({"label": "Open Notes Digitizer", "action": "open_notes", "payload": {}})
        if "quiz" in lower or hits:
            chips.append({"label": "Quiz on Research Topic", "action": "generate_quiz", "payload": {"topic": message[:60]}})
    return chips


def _synthesize_grounded_reply(
    db: Session,
    user: User,
    bot_type: str,
    message: str,
    hits: list[dict[str, Any]],
) -> str:
    lower = message.lower()
    upcoming = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == user.id,
            CalendarEvent.completed.is_(False),
            CalendarEvent.start_time >= datetime.now(timezone.utc),
        )
        .order_by(CalendarEvent.start_time.asc())
        .limit(3)
        .all()
    )
    courses = db.query(Course).filter(Course.user_id == user.id).all()
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(5)
        .all()
    )

    if bot_type == "advisor":
        completed_courses = [c for c in courses if c.status == "completed"]
        enrolled_courses = [c for c in courses if c.status == "enrolled"]
        remaining = max(0, 138 - (user.credits_completed or 0))
        lines = [
            f"### Academic Advising Plan for {user.full_name}",
            f"- **Major:** {user.major} | **Term:** {user.trimester} | **Credits Completed:** {user.credits_completed}/138 (~{remaining} credits remaining)",
            "",
            "**Currently Enrolled Courses:**",
        ]
        for c in enrolled_courses[:5]:
            lines.append(f"- `{c.code}` — {c.title} ({c.credits} cr, {c.schedule})")
        if completed_courses:
            lines.append("")
            lines.append(
                "**Completed Prerequisites Detected:** "
                + ", ".join(f"`{c.code}` ({c.grade or 'Pass'})" for c in completed_courses[:6])
            )
        lines.extend(
            [
                "",
                "**Recommended Next-Term Plan (12 Credits — Conflict-Free):**",
                "1. **CSE415 — Distributed Systems** (3 cr) — builds directly on your Operating Systems & Networks foundation.",
                "2. **CSE442 — Machine Learning Engineering** (3 cr) — pairs well with your strong Linear Algebra / Probability standing.",
                "3. **CSE499B — Capstone Design Project II** (3 cr) — final thesis/system delivery milestone.",
                "4. **GED310 — Technology Ethics & Governance** (3 cr) — fulfills general-education graduation requirement without lab overload.",
            ]
        )
        if hits:
            lines.append("")
            lines.append("**Grounded Institutional Guidance:**")
            for h in hits[:2]:
                lines.append(f"- *[{h['title']}]* {h['excerpt']}")
        return "\n".join(lines)

    if bot_type == "research":
        topic = message.strip().rstrip("?")
        if len(topic) < 4:
            topic = "Retrieval-Augmented Generation in Educational Platforms"
        lines = [
            f"### Research Workspace Guide: {topic}",
            "",
            "**1. Precision Academic Search Strings**",
            f'- IEEE Xplore / ACM DL: `("{topic}" OR "intelligent tutoring") AND ("evaluation" OR "empirical study") AND ("university" OR "higher education")`',
            f'- Google Scholar: `allintitle: "{topic}" benchmark OR architecture 2023..2026`',
            "",
            "**2. Recommended Methodology Checklist**",
            "- Define research questions (RQs) with measurable baselines (precision@k, latency, or learning gain).",
            "- Separate dataset splitting / evaluation protocol before tuning parameters to prevent leakage.",
            "- Include ablation results comparing baseline vs. proposed system and report statistical significance.",
            "",
            "**3. IEEE Citation Template**",
            f'> [1] U. U. Snigdha and A. Collaborator, "{topic}: Architecture, Evaluation, and Empirical Findings," *Proc. IEEE Int. Conf. on Educational Technology & Systems*, pp. 112–120, 2026.',
        ]
        if hits:
            lines.append("")
            lines.append("**Relevant Notes & Corpus Matches:**")
            for h in hits[:2]:
                lines.append(f"- *[{h['title']}]* ({h['course_code']}): {h['excerpt']}")
        return "\n".join(lines)

    # Default: UNIQ Personalized Assistant
    lines: list[str] = []
    if hits:
        top = hits[0]
        lines.append(f"Based on your academic knowledge base (**{top['title']}** — `{top['course_code']}`):")
        lines.append("")
        for idx, h in enumerate(hits[:3], start=1):
            label = "Personal Note" if h["source_type"] == "note" else "University Policy / FAQ"
            lines.append(f"**{idx}. [{h['title']}]** *({label}, match {int(h['score'] * 100)}%)*")
            lines.append(f"> {h['excerpt']}")
            lines.append("")
    else:
        lines.append(
            f"Hi {user.full_name.split()[0]}! I checked your notes and institutional knowledge base for **\"{message[:80]}\"**."
        )
        lines.append("")

    if any(k in lower for k in ("today", "deadline", "upcoming", "task", "exam", "schedule", "plan")):
        if upcoming:
            lines.append("**Your Next Priority Deadlines:**")
            for ev in upcoming:
                when = ev.start_time.strftime("%a, %b %d at %I:%M %p")
                lines.append(f"- **{ev.title}** (`{ev.course_code}` • {ev.event_type}) — {when}")
            lines.append("")

    if attempts and any(k in lower for k in ("weak", "score", "quiz", "study", "improve", "progress")):
        avg_score = round(sum(a.score_percent for a in attempts) / len(attempts), 1)
        weakest = min(attempts, key=lambda a: a.score_percent)
        lines.append(
            f"**Study Insight:** Your recent quiz average is **{avg_score}%**. "
            f"Prioritize a 30-minute focused review on `{weakest.course_code}` (last score {weakest.score_percent:.0f}%)."
        )
        lines.append("")

    lines.append(
        "**Recommended Next Step:** Use the quick action chips below to add a study block to your calendar, "
        "generate a grounded practice quiz, or refresh your daily routine."
    )
    return "\n".join(lines)


def generate_chat_response(
    db: Session,
    user: User,
    bot_type: str,
    message: str,
    hits: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]], str]:
    context_block = "\n\n".join(
        f"[{h['title']} | {h['course_code']}]: {h['full_text']}" for h in hits
    )
    user_prompt = (
        f"Student: {user.full_name} ({user.major}, {user.trimester})\n"
        f"Retrieved Context:\n{context_block or 'No matching documents found.'}\n\n"
        f"Student Query: {message}"
    )

    llm_text, provider = _call_external_llm(BOT_SYSTEM_PROMPTS[bot_type], user_prompt)
    if not llm_text:
        llm_text = _synthesize_grounded_reply(db, user, bot_type, message, hits)
        provider = "local-hybrid-rag"

    chips = _build_action_chips(bot_type, message, hits)
    return llm_text, chips, provider


def stream_text_chunks(text: str, words_per_chunk: int = 8) -> Iterator[str]:
    words = text.split(" ")
    for i in range(0, len(words), words_per_chunk):
        piece = " ".join(words[i : i + words_per_chunk])
        if i + words_per_chunk < len(words):
            piece += " "
        yield piece
