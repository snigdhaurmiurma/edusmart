"""UNIQ, Advisor, and Research AI Chatbots with Hybrid RAG, citations, action chips, and SSE streaming."""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, ChatSession, User
from app.schemas import ChatRequest
from app.security import get_current_user
from app.services.llm_adapter import generate_chat_response, stream_text_chunks
from app.services.rag import retrieve_hybrid

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _get_or_create_session(db: Session, user: User, bot_type: str, session_id: int | None, first_msg: str) -> ChatSession:
    if session_id:
        sess = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
            .first()
        )
        if sess:
            return sess
    sess = ChatSession(
        user_id=user.id,
        bot_type=bot_type,
        title=first_msg.strip()[:70] or f"{bot_type.title()} Session",
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def _serialize_message(m: ChatMessage) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "citations": json.loads(m.citations_json or "[]"),
        "action_chips": json.loads(m.action_chips_json or "[]"),
        "created_at": m.created_at.isoformat(),
    }


@router.get("/sessions")
def list_sessions(
    bot_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    if bot_type:
        q = q.filter(ChatSession.bot_type == bot_type)
    sessions = q.order_by(ChatSession.updated_at.desc()).limit(30).all()
    return [
        {
            "id": s.id,
            "bot_type": s.bot_type,
            "title": s.title,
            "updated_at": s.updated_at.isoformat(),
            "message_count": len(s.messages),
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sess = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return {
        "session": {"id": sess.id, "bot_type": sess.bot_type, "title": sess.title},
        "messages": [_serialize_message(m) for m in sess.messages],
    }


@router.post("/message")
def send_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sess = _get_or_create_session(db, current_user, payload.bot_type, payload.session_id, payload.message)
    user_msg = ChatMessage(session_id=sess.id, role="user", content=payload.message.strip())
    db.add(user_msg)
    db.commit()

    allow_personal = bool(payload.use_personal_notes and current_user.consent_rag_personal)
    hits, latency_ms = retrieve_hybrid(
        db=db,
        user_id=current_user.id,
        query=payload.message,
        bot_type=payload.bot_type,
        include_personal_notes=allow_personal,
        top_k=4,
    )

    reply_text, chips, provider = generate_chat_response(db, current_user, payload.bot_type, payload.message, hits)
    citations = [
        {
            "chunk_id": h["chunk_id"],
            "title": h["title"],
            "source_type": h["source_type"],
            "course_code": h["course_code"],
            "score": h["score"],
            "excerpt": h["excerpt"],
        }
        for h in hits
    ]

    assistant_msg = ChatMessage(
        session_id=sess.id,
        role="assistant",
        content=reply_text,
        citations_json=json.dumps(citations),
        action_chips_json=json.dumps(chips),
    )
    sess.updated_at = datetime.now(timezone.utc)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return {
        "session_id": sess.id,
        "provider": provider,
        "latency_ms": latency_ms,
        "personal_context_used": allow_personal,
        "message": _serialize_message(assistant_msg),
    }


@router.post("/stream")
def stream_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Server-Sent Events streaming endpoint for UNIQ, Advisor, and Research chatbots."""
    sess = _get_or_create_session(db, current_user, payload.bot_type, payload.session_id, payload.message)
    user_msg = ChatMessage(session_id=sess.id, role="user", content=payload.message.strip())
    db.add(user_msg)
    db.commit()

    allow_personal = bool(payload.use_personal_notes and current_user.consent_rag_personal)
    hits, latency_ms = retrieve_hybrid(
        db=db,
        user_id=current_user.id,
        query=payload.message,
        bot_type=payload.bot_type,
        include_personal_notes=allow_personal,
        top_k=4,
    )
    reply_text, chips, provider = generate_chat_response(db, current_user, payload.bot_type, payload.message, hits)
    citations = [
        {
            "chunk_id": h["chunk_id"],
            "title": h["title"],
            "source_type": h["source_type"],
            "course_code": h["course_code"],
            "score": h["score"],
            "excerpt": h["excerpt"],
        }
        for h in hits
    ]

    assistant_msg = ChatMessage(
        session_id=sess.id,
        role="assistant",
        content=reply_text,
        citations_json=json.dumps(citations),
        action_chips_json=json.dumps(chips),
    )
    sess.updated_at = datetime.now(timezone.utc)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    def event_stream():
        meta = {
            "type": "meta",
            "session_id": sess.id,
            "message_id": assistant_msg.id,
            "provider": provider,
            "latency_ms": latency_ms,
            "citations": citations,
            "action_chips": chips,
        }
        yield f"data: {json.dumps(meta)}\n\n"
        for chunk in stream_text_chunks(reply_text):
            yield f"data: {json.dumps({'type': 'token', 'token': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
