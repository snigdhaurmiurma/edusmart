"""Hybrid Retrieval-Augmented Generation (BM25 + dense cosine) with strict tenant isolation."""

from collections import Counter
import hashlib
import json
import math
import re
import time
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import InstitutionalDoc, Note, RagChunk, RagTelemetry

EMBEDDING_DIM = 96
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
    "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were",
    "will", "with", "this", "what", "how", "can", "i", "my", "me", "do", "does",
    "should", "about", "you", "your", "or", "we", "our", "they", "their",
}


def tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9_+#.-]+", text.lower())
    return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]


def compute_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic feature-hashed dense vector (word + char-trigram projection)."""
    vec = [0.0] * dim
    tokens = tokenize(text)
    if not tokens:
        return vec
    for tok in tokens:
        h = int(hashlib.blake2b(tok.encode("utf-8"), digest_size=8).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        vec[idx] += sign * 1.5
        if len(tok) >= 4:
            for i in range(len(tok) - 2):
                gram = tok[i : i + 3]
                gh = int(hashlib.blake2b(gram.encode("utf-8"), digest_size=8).hexdigest(), 16)
                gidx = gh % dim
                gsign = 1.0 if ((gh >> 8) & 1) == 0 else -1.0
                vec[gidx] += gsign * 0.45

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [round(v / norm, 5) for v in vec]
    return vec


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def chunk_text(text: str, max_chars: int = 420, overlap: int = 60) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text.strip()) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            if len(para) <= max_chars:
                current = para
            else:
                start = 0
                while start < len(para):
                    end = min(len(para), start + max_chars)
                    chunks.append(para[start:end].strip())
                    if end == len(para):
                        break
                    start = max(0, end - overlap)
                current = ""
    if current:
        chunks.append(current)
    return chunks or [text.strip()[:max_chars]]


def index_note(db: Session, note: Note) -> int:
    """Re-index a student's note into tenant-scoped RAG chunks."""
    db.query(RagChunk).filter(RagChunk.note_id == note.id).delete()
    chunks = chunk_text(f"{note.title} ({note.course_code})\n\n{note.content}")
    for idx, piece in enumerate(chunks):
        emb = compute_embedding(piece)
        db.add(
            RagChunk(
                tenant_user_id=note.user_id,
                source_type="note",
                note_id=note.id,
                title=note.title,
                course_code=note.course_code,
                chunk_index=idx,
                chunk_text=piece,
                embedding_json=json.dumps(emb),
            )
        )
    db.commit()
    return len(chunks)


def purge_note_chunks(db: Session, note_id: int) -> int:
    """Guarantee vector/chunk purge when a student note is deleted."""
    deleted = db.query(RagChunk).filter(RagChunk.note_id == note_id).delete()
    db.commit()
    return deleted


def index_institutional_doc(db: Session, doc: InstitutionalDoc) -> int:
    """Index an admin-published institutional policy, FAQ, or curriculum doc."""
    db.query(RagChunk).filter(RagChunk.institutional_doc_id == doc.id).delete()
    if not doc.is_published:
        db.commit()
        return 0
    chunks = chunk_text(f"{doc.title} [{doc.category}]\n\n{doc.content}")
    for idx, piece in enumerate(chunks):
        emb = compute_embedding(piece)
        db.add(
            RagChunk(
                tenant_user_id=None,
                source_type="institutional",
                institutional_doc_id=doc.id,
                title=doc.title,
                course_code=doc.course_code or doc.category.upper(),
                chunk_index=idx,
                chunk_text=piece,
                embedding_json=json.dumps(emb),
            )
        )
    db.commit()
    return len(chunks)


def retrieve_hybrid(
    db: Session,
    user_id: int,
    query: str,
    bot_type: str = "uniq",
    include_personal_notes: bool = True,
    top_k: int = 4,
) -> tuple[list[dict[str, Any]], float]:
    """
    Hybrid BM25 + dense cosine retrieval with strict pre-ranking tenant isolation.
    A user can ONLY retrieve institutional chunks (tenant_user_id IS NULL) and,
    if consented/enabled, their own chunks (tenant_user_id == user_id).
    """
    t0 = time.perf_counter()

    # Pre-ranking tenant isolation filter (SRS 5.3 & 5.5)
    if include_personal_notes:
        candidates = (
            db.query(RagChunk)
            .filter(or_(RagChunk.tenant_user_id.is_(None), RagChunk.tenant_user_id == user_id))
            .all()
        )
    else:
        candidates = db.query(RagChunk).filter(RagChunk.tenant_user_id.is_(None)).all()

    if not candidates:
        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return [], latency_ms

    q_tokens = tokenize(query)
    q_emb = compute_embedding(query)

    # Precompute corpus statistics for BM25
    doc_tokens_list = [tokenize(c.chunk_text) for c in candidates]
    n_docs = len(candidates)
    avgdl = sum(len(dt) for dt in doc_tokens_list) / max(n_docs, 1)
    df: Counter[str] = Counter()
    for dt in doc_tokens_list:
        for term in set(dt):
            df[term] += 1

    k1 = 1.5
    b = 0.75
    scored: list[dict[str, Any]] = []

    for chunk, d_tokens in zip(candidates, doc_tokens_list):
        tf = Counter(d_tokens)
        dl = max(len(d_tokens), 1)
        bm25 = 0.0
        for term in q_tokens:
            if term not in tf:
                continue
            idf = math.log(1.0 + (n_docs - df[term] + 0.5) / (df[term] + 0.5))
            num = tf[term] * (k1 + 1.0)
            den = tf[term] + k1 * (1.0 - b + b * (dl / max(avgdl, 1.0)))
            bm25 += idf * (num / den)

        try:
            d_emb = json.loads(chunk.embedding_json)
        except Exception:
            d_emb = []
        dense = max(0.0, cosine_similarity(q_emb, d_emb))

        # Normalize BM25 smoothly into [0, 1) and fuse with cosine similarity
        bm25_norm = bm25 / (bm25 + 2.5) if bm25 > 0 else 0.0
        hybrid_score = round(0.62 * bm25_norm + 0.38 * dense, 4)

        if hybrid_score >= 0.08:
            scored.append(
                {
                    "chunk_id": chunk.id,
                    "title": chunk.title,
                    "source_type": chunk.source_type,
                    "course_code": chunk.course_code,
                    "score": hybrid_score,
                    "excerpt": chunk.chunk_text[:280].strip(),
                    "full_text": chunk.chunk_text,
                }
            )

    scored.sort(key=lambda item: item["score"], reverse=True)
    hits = scored[:top_k]
    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    db.add(
        RagTelemetry(
            user_id=user_id,
            bot_type=bot_type,
            query_preview=query[:150],
            retrieval_k=top_k,
            hits_count=len(hits),
            hit_at_1=bool(hits and hits[0]["score"] >= 0.18),
            latency_ms=latency_ms,
            provider="local-hybrid-rag",
        )
    )
    db.commit()

    return hits, latency_ms
