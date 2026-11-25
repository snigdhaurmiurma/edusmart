import React, { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Download, FileScan, Plus, Save, Trash2, Upload } from "lucide-react";

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
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadNotes = async () => {
    const qParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
    const list = await apiRequest<NoteItem[]>(`/api/notes${qParam}`);
    setNotes(list);
    if (!selected && list.length > 0) {
      selectNote(list[0]);
    }
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("course_code", uploadCourse);
      form.append("tags", "ocr,digitized");
      const created = await apiRequest<NoteItem>("/api/notes/digitize", {
        method: "POST",
        body: form,
      });
      await loadNotes();
      selectNote(created);
      setFeedback(`Digitized "${file.name}" and indexed into your personal RAG knowledge base!`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCreateBlank = async () => {
    const created = await apiRequest<NoteItem>("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: "New Study Note",
        course_code: uploadCourse,
        tags: "study",
        content: "# Lecture Summary\n\n- Key concept:\n- Example problem:\n",
      }),
    });
    await loadNotes();
    selectNote(created);
    setFeedback("Created new Markdown note and indexed for RAG.");
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
      setFeedback("Saved changes & re-indexed note chunks for UNIQ Chat and Quiz Generator.");
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
    setFeedback(`Note deleted and purged ${res.purged_rag_chunks} vector chunks from RAG index.`);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Handwritten Notes Digitizer (OCR)</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Upload handwritten photos, PDFs, or text files to extract editable Markdown, flag low-confidence OCR lines, and export.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ width: 110 }}
            value={uploadCourse}
            onChange={(e) => setUploadCourse(e.target.value.toUpperCase())}
            placeholder="Course"
            aria-label="Course code for upload"
          />
          <label className="btn btn-gradient" style={{ cursor: "pointer" }}>
            <Upload size={16} /> {uploading ? "Digitizing..." : "Upload / OCR"}
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn btn-white" onClick={handleCreateBlank}>
            <Plus size={16} /> New Note
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: "rgba(123, 47, 247, 0.1)",
            color: "var(--brand-purple)",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          {feedback}
        </div>
      )}

      <div className="chat-shell" style={{ gridTemplateColumns: "300px 1fr" }}>
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
            DIGITIZED LIBRARY ({notes.length})
          </div>
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNote(n)}
              style={{
                textAlign: "left",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 12,
                background: selected?.id === n.id ? "rgba(59, 130, 246, 0.1)" : "var(--bg-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span className="badge badge-blue">{n.course_code}</span>
                <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 700 }}>
                  {Math.round(n.ocr_confidence * 100)}% OCR
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", marginTop: 6 }}>{n.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                {n.summary.slice(0, 78)}...
              </div>
            </button>
          ))}
        </div>

        <div className="card">
          {!selected ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              <FileScan size={36} style={{ marginBottom: 10 }} />
              <p>Select a note or upload a handwritten page to begin.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  className="input"
                  style={{ flex: 2, fontWeight: 700 }}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <input
                  className="input"
                  style={{ width: 120 }}
                  value={editCourse}
                  onChange={(e) => setEditCourse(e.target.value.toUpperCase())}
                />
              </div>

              {selected.low_confidence_lines.length > 0 && (
                <div
                  style={{
                    background: "var(--amber-banner-bg)",
                    border: "1px solid var(--amber-banner-border)",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: "0.84rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--amber-banner-text)" }}>
                    <AlertTriangle size={15} /> Low-Confidence OCR Lines Flagged for Review
                  </div>
                  {selected.low_confidence_lines.map((line, i) => (
                    <div key={i} style={{ marginTop: 6 }}>
                      <strong>Line {line.line_number}</strong> ({Math.round(line.confidence * 100)}%): <code>{line.text}</code>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{line.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                className="textarea"
                rows={13}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1.55 }}
              />

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-gradient btn-sm" onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? "Saving..." : "Save & Re-Index RAG"}
                  </button>
                  <button className="btn btn-white btn-sm" onClick={() => onNavigate("quizzes")}>
                    <BookOpen size={15} /> Generate Quiz
                  </button>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=pdf`, `${selected.course_code}_note.pdf`)}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=md`, `${selected.course_code}_note.md`)}
                  >
                    <Download size={14} /> MD
                  </button>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => downloadWithAuth(`/api/notes/${selected.id}/export?fmt=txt`, `${selected.course_code}_note.txt`)}
                  >
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
