"""Handwritten Notes Digitizer (OCR upload, Markdown editor, RAG re-indexing, exports, cascade purge)."""

import json
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Note, User
from app.schemas import NoteCreateRequest, NoteUpdateRequest
from app.security import get_current_user, record_audit
from app.services.ocr import _analyze_confidence, _summarize_text, digitize_upload, export_note_pdf
from app.services.rag import index_note, purge_note_chunks

router = APIRouter(prefix="/api/notes", tags=["notes"])
ALLOWED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md")
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _serialize_note(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "course_code": note.course_code,
        "tags": note.tags,
        "content": note.content,
        "summary": note.summary,
        "source_filename": note.source_filename,
        "ocr_confidence": note.ocr_confidence,
        "low_confidence_lines": json.loads(note.low_confidence_lines_json or "[]"),
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


@router.get("")
def list_notes(
    q: str | None = None,
    course_code: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if course_code and course_code != "ALL":
        query = query.filter(Note.course_code == course_code)
    notes = query.order_by(Note.updated_at.desc()).all()
    if q:
        needle = q.strip().lower()
        notes = [
            n
            for n in notes
            if needle in n.title.lower() or needle in n.content.lower() or needle in n.tags.lower()
        ]
    return [_serialize_note(n) for n in notes]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conf, low_lines = _analyze_confidence(payload.content)
    note = Note(
        user_id=current_user.id,
        title=payload.title.strip(),
        course_code=payload.course_code.strip().upper(),
        tags=payload.tags.strip(),
        content=payload.content,
        summary=_summarize_text(payload.content),
        ocr_confidence=conf,
        low_confidence_lines_json=json.dumps(low_lines),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    index_note(db, note)
    return _serialize_note(note)


@router.post("/digitize", status_code=status.HTTP_201_CREATED)
async def digitize_note_upload(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    course_code: str = Form(default="CSC301"),
    tags: str = Form(default="handwritten,ocr"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.consent_ocr_processing:
        raise HTTPException(
            status_code=403,
            detail="OCR processing consent is disabled in your Profile & Privacy settings.",
        )
    filename = file.filename or "upload.txt"
    if not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 8 MB maximum upload limit.")

    result = digitize_upload(filename, raw, course_code.upper())
    final_title = title.strip() or filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    note = Note(
        user_id=current_user.id,
        title=final_title,
        course_code=course_code.strip().upper(),
        tags=tags.strip(),
        content=result["content"],
        summary=result["summary"],
        source_filename=filename,
        ocr_confidence=result["ocr_confidence"],
        low_confidence_lines_json=json.dumps(result["low_confidence_lines"]),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    chunks_indexed = index_note(db, note)
    record_audit(db, action="notes.digitized", actor=current_user, target=f"note:{note.id}", details=filename)

    out = _serialize_note(note)
    out["chunks_indexed"] = chunks_indexed
    return out


@router.put("/{note_id}")
def update_note(
    note_id: int,
    payload: NoteUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    if payload.title is not None:
        note.title = payload.title.strip()
    if payload.course_code is not None:
        note.course_code = payload.course_code.strip().upper()
    if payload.tags is not None:
        note.tags = payload.tags.strip()
    if payload.content is not None:
        note.content = payload.content
        note.summary = _summarize_text(payload.content)
        conf, low_lines = _analyze_confidence(payload.content)
        note.ocr_confidence = conf
        note.low_confidence_lines_json = json.dumps(low_lines)

    db.commit()
    db.refresh(note)
    index_note(db, note)
    return _serialize_note(note)


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    purged_chunks = purge_note_chunks(db, note.id)
    db.delete(note)
    db.commit()
    record_audit(
        db,
        action="notes.deleted_cascade_purge",
        actor=current_user,
        target=f"note:{note_id}",
        details=f"Purged {purged_chunks} RAG chunks",
    )
    return {"deleted": True, "purged_rag_chunks": purged_chunks}


@router.get("/{note_id}/export")
def export_note(
    note_id: int,
    fmt: str = "pdf",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in note.title)[:50] or "note"
    fmt_lower = fmt.lower()
    if fmt_lower == "pdf":
        pdf_bytes = export_note_pdf(note.title, note.course_code, note.content)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
        )
    if fmt_lower == "md":
        body = f"# {note.title}\n\n*Course: {note.course_code}*\n\n{note.content}\n"
        return Response(
            content=body.encode("utf-8"),
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.md"'},
        )
    body = f"{note.title} ({note.course_code})\n{'=' * 40}\n\n{note.content}\n"
    return Response(
        content=body.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.txt"'},
    )
