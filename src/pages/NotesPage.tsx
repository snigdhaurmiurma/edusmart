import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Download,
  Eye,
  FileScan,
  PenLine,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { apiRequest, downloadWithAuth } from "../lib/api";
import type { AppRoute, NoteItem } from "../types";

interface NotesPageProps {
  searchQuery: string;
  onNavigate: (r: AppRoute) => void;
}

export const NotesPage: React.FC<NotesPageProps> = ({ searchQuery, onNavigate }) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selected, setSelected] = useState<NoteItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCourse, setEditCourse] = useState("CSC301");
  const [editContent, setEditContent] = useState("");
  const [uploadCourse, setUploadCourse] = useState("CSC301");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadNotes = async () => {
    const qParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
    const list = await apiRequest<NoteItem[]>(`/api/notes${qParam}`);
    setNotes(list);
    if (!selected && list.length > 0) selectNote(list[0]);
  };

  useEffect(() => {
    loadNotes();
  }, [searchQuery]);

  const selectNote = (n: NoteItem) => {
    setSelected(n);
    setEditTitle(n.title);
    setEditCourse(n.course_code);
    setEditContent(n.content);
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("course_code", uploadCourse.trim().toUpperCase() || "GEN101");
      form.append("tags", "ocr,digitized");
      const created = await apiRequest<NoteItem & { chunks_indexed?: number }>("/api/notes/digitize", {
        method: "POST",
        body: form,
      });
      await loadNotes();
      selectNote(created);
      setFeedback(`Digitized "${file.name}" and indexed ${created.chunks_indexed ?? 1} chunk(s) into your personal RAG store!`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleCreateBlank = async () => {
    const created = await apiRequest<NoteItem>("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: "New Study Note",
        course_code: uploadCourse.trim().toUpperCase() || "GEN101",
        tags: "study",
        content: "# Lecture Summary\n\n- **Core Concept:** Write the main theorem or definition here.\n- **Worked Example:** Step-by-step derivation.\n",
      }),
    });
    await loadNotes();
    selectNote(created);
    setPreviewMode(false);
    setFeedback("Created new Markdown note and indexed into RAG.");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiRequest<NoteItem>(`/api/notes/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle, course_code: editCourse, content: editContent }),
      });
      setSelected(updated);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setFeedback("Saved changes & re-indexed note chunks for UNIQ RAG Chat and Quiz Generator.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiRequest<{ purged_rag_chunks: number }>(`/api/notes/${id}`, { method: "DELETE" });
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (remaining.length > 0) selectNote(remaining[0]);
    else setSelected(null);
    setFeedback(`Deleted note and cascade-purged ${res.purged_rag_chunks} vector chunk(s) from RAG index.`);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Handwritten Notes Digitizer (OCR → RAG)</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Drag &amp; drop handwritten photos, PDFs, or text files to extract editable Markdown, index into RAG, and export.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input className="input" style={{ width: 110 }} value={uploadCourse} onChange={(e) => setUploadCourse(e.target.value.toUpperCase())} placeholder="Course" aria-label="Course code" />
          <button className="btn btn-white" onClick={handleCreateBlank}>
            <Plus size={16} /> New Note
          </button>
        </div>
      </div>

      {/* Drag & Drop OCR Upload Zone */}
      <label
        className={`dropzone ${dragging ? "dragging" : ""}`}
        style={{ display: "block", marginBottom: 18 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={22} color="var(--brand-purple)" style={{ marginBottom: 6 }} />
        <div style={{ fontWeight: 700, fontSize: "0.94rem" }}>
          {uploading ? "Running OCR & Indexing into RAG..." : "Drag & drop a handwritten note, PDF, or Markdown file here — or click to browse"}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
          Supports PNG, JPG, WEBP, PDF, TXT, MD (up to 4 MB) • Automatically tagged as {uploadCourse || "GEN101"}
        </div>
        <input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md" onChange={handleUpload} style={{ display: "none" }} />
      </label>

      {feedback && (
        <div style={{ background: "rgba(123, 47, 247, 0.1)", color: "var(--brand-purple)", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
          {feedback}
        </div>
      )}

      <div className="chat-shell" style={{ gridTemplateColumns: "290px 1fr" }}>
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
            DIGITIZED LIBRARY ({notes.length})
          </div>
          {notes.length === 0 ? (
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>No notes yet. Upload a file or click New Note above!</p>
          ) : (
            notes.map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selected?.id === n.id ? "var(--brand-purple)" : "var(--border-subtle)"}`,
                  borderRadius: 12,
                  padding: 12,
                  background: selected?.id === n.id ? "rgba(123, 47, 247, 0.08)" : "var(--bg-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span className="badge badge-blue">{n.course_code}</span>
                  <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 700 }}>{Math.round(n.ocr_confidence * 100)}% OCR</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: 6 }}>{n.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>{n.summary.slice(0, 74)}...</div>
              </button>
            ))
          )}
        </div>

        <div className="card">
          {!selected ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              <FileScan size={36} style={{ marginBottom: 10 }} />
              <p>Select a note or drop a file above to digitize and index into RAG.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input className="input" style={{ flex: 2, fontWeight: 700 }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <input className="input" style={{ width: 110 }} value={editCourse} onChange={(e) => setEditCourse(e.target.value.toUpperCase())} />
                <button className="btn btn-soft btn-sm" onClick={() => setPreviewMode((p) => !p)}>
                  {previewMode ? <><PenLine size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
                </button>
              </div>

              {selected.low_confidence_lines.length > 0 && (
                <div style={{ background: "var(--amber-banner-bg)", border: "1px solid var(--amber-banner-border)", borderRadius: 12, padding: 12, fontSize: "0.84rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--amber-banner-text)" }}>
                    <AlertTriangle size={15} /> Low-Confidence OCR Lines Flagged
                  </div>
                  {selected.low_confidence_lines.map((line, i) => (
                    <div key={i} style={{ marginTop: 6 }}>
                      <strong>Line {line.line_number}</strong> ({Math.round(line.confidence * 100)}%): <code>{line.text}</code>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{line.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}

              {previewMode ? (
                <div style={{ padding: 18, borderRadius: 12, background: "var(--bg-subtle)", minHeight: 280, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {editContent}
                </div>
              ) : (
                <textarea
                  className="textarea"
                  rows={13}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1.55 }}
                />
              )}

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-gradient btn-sm" onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? "Saving..." : "Save & Re-Index RAG"}
                  </button>
                  <button className="btn btn-white btn-sm" onClick={() => onNavigate("chat-uniq")}>
                    <Sparkles size={14} color="var(--brand-purple)" /> Ask UNIQ RAG
                  </button>
                  <button className="btn btn-white btn-sm" onClick={() => onNavigate("quizzes")}>
                    <BookOpen size={14} /> Quiz This Note
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=pdf`, `${selected.course_code}_note.pdf`)}>
                    <Download size={14} /> PDF
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=md`, `${selected.course_code}_note.md`)}>
                    <Download size={14} /> MD
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=txt`, `${selected.course_code}_note.txt`)}>
                    <Download size={14} /> TXT
                  </button>
                </div>

                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={14} /> Delete &amp; Purge RAG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
