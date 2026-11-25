import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarPlus,
  ChevronDown,
  Cpu,
  Database,
  FlaskConical,
  GraduationCap,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { apiRequest, getStoredToken } from "../lib/api";
import type { ActionChip, AppRoute, ChatMessage, ChatSessionSummary } from "../types";

interface ChatPageProps {
  botType: "uniq" | "advisor" | "research";
  onNavigate: (r: AppRoute) => void;
}

interface RagIndexInfo {
  personal_chunks_count: number;
  institutional_chunks_count: number;
  consent_personal_enabled: boolean;
  personal_sources: { chunk_id: number; title: string; course_code: string; chunk_index: number; preview: string }[];
  institutional_sources: { chunk_id: number; title: string; course_code: string; chunk_index: number; preview: string }[];
}

const BOT_META = {
  uniq: {
    name: "UNIQ RAG Assistant",
    subtitle: "Hybrid BM25 + dense vector RAG grounded in your uploaded notes & university policies",
    icon: Sparkles,
    color: "#7b2ff7",
    prompts: [
      "Summarize my CSC301 Dynamic Programming and Dijkstra notes.",
      "How do university merit scholarships and tuition waivers work?",
      "What are my upcoming deadlines and how should I prepare?",
    ],
  },
  advisor: {
    name: "Advisor RAG Bot",
    subtitle: "Degree audit, prerequisite verification, and term planning grounded in curriculum policies",
    icon: GraduationCap,
    color: "#1d55c4",
    prompts: [
      "What are the CSE degree credit requirements and prerequisites?",
      "Review my enrolled courses and suggest a balanced next-term load.",
      "Am I eligible for 400-level electives and CSE499 Capstone?",
    ],
  },
  research: {
    name: "Research RAG Bot",
    subtitle: "IEEE citation rules, literature search builders, and synthesis across your notes",
    icon: FlaskConical,
    color: "#e000a8",
    prompts: [
      "Explain IEEE citation guidelines and capstone paper standards.",
      "Generate search queries for Hybrid RAG in educational platforms.",
      "Synthesize my algorithms notes into a literature review outline.",
    ],
  },
};

export const ChatPage: React.FC<ChatPageProps> = ({ botType, onNavigate }) => {
  const meta = BOT_META[botType];
  const Icon = meta.icon;

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sourceScope, setSourceScope] = useState<"all" | "personal" | "institutional">("all");
  const [sending, setSending] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RAG Inspector & Quick Ingest State
  const [ragIndex, setRagIndex] = useState<RagIndexInfo | null>(null);
  const [showRagDrawer, setShowRagDrawer] = useState(false);
  const [showIngest, setShowIngest] = useState(false);
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestCourse, setIngestCourse] = useState("CSC301");
  const [ingestText, setIngestText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [expandedMsgId, setExpandedMsgId] = useState<number | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const list = await apiRequest<ChatSessionSummary[]>(`/api/chat/sessions?bot_type=${botType}`);
      setSessions(list);
    } catch {
      // ignore
    }
  };

  const loadRagIndex = async () => {
    try {
      const idx = await apiRequest<RagIndexInfo>("/api/rag/index");
      setRagIndex(idx);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
    setStatusBanner(null);
    loadSessions();
    loadRagIndex();
  }, [botType]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSession = async (id: number) => {
    setActiveSessionId(id);
    const data = await apiRequest<{ messages: ChatMessage[] }>(`/api/chat/sessions/${id}/messages`);
    setMessages(data.messages);
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiRequest(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    loadSessions();
  };

  const handleQuickIngestText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestText.trim()) return;
    setIngesting(true);
    try {
      const created = await apiRequest<{ chunks_indexed: number }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: ingestTitle.trim(),
          course_code: ingestCourse.trim().toUpperCase() || "GENERAL",
          tags: "rag-upload",
          content: ingestText.trim(),
        }),
      });
      setIngestTitle("");
      setIngestText("");
      setShowIngest(false);
      await loadRagIndex();
      setStatusBanner(`Indexed "${ingestTitle.trim()}" into your personal RAG store (${created.chunks_indexed} vector chunks). Ask anything about it now!`);
    } finally {
      setIngesting(false);
    }
  };

  const handleQuickIngestFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngesting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("course_code", ingestCourse.trim().toUpperCase() || "GENERAL");
      const created = await apiRequest<{ title: string; chunks_indexed: number }>("/api/notes/digitize", {
        method: "POST",
        body: form,
      });
      setShowIngest(false);
      await loadRagIndex();
      setStatusBanner(`Uploaded & indexed "${created.title}" (${created.chunks_indexed} RAG chunks). Ready for grounded Q&A!`);
    } catch (err) {
      setStatusBanner(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIngesting(false);
      e.target.value = "";
    }
  };

  const handleActionChip = async (chip: ActionChip) => {
    if (chip.action === "add_calendar") {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await apiRequest("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: chip.payload.title || "RAG Guided Study Block",
          event_type: chip.payload.event_type || "study",
          course_code: chip.payload.course_code || "STUDY",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          priority: "medium",
        }),
      });
      setStatusBanner("Added study session to your Smart Academic Calendar!");
      return;
    }
    if (chip.action === "seed_routine") {
      await apiRequest("/api/routine/generate", { method: "POST", body: JSON.stringify({}) });
      onNavigate("routine");
      return;
    }
    if (chip.action === "generate_quiz") {
      onNavigate("quizzes");
      return;
    }
    if (chip.action === "open_sync") {
      onNavigate("sync");
      return;
    }
    if (chip.action === "open_notes") {
      onNavigate("notes");
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setInput("");
    setStatusBanner(null);
    setSending(true);

    const tempUserId = Date.now();
    const tempBotId = tempUserId + 1;

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: text, citations: [], action_chips: [], created_at: new Date().toISOString() },
      { id: tempBotId, role: "assistant", content: "", citations: [], action_chips: [], created_at: new Date().toISOString() },
    ]);

    try {
      const token = getStoredToken();
      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bot_type: botType,
          message: text,
          session_id: activeSessionId,
          use_personal_notes: sourceScope !== "institutional",
          source_scope: sourceScope,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream unavailable");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const ev of events) {
          if (!ev.startsWith("data: ")) continue;
          const payload = JSON.parse(ev.slice(6));
          if (payload.type === "meta") {
            setActiveSessionId(payload.session_id);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempBotId
                  ? {
                      ...m,
                      citations: payload.citations || [],
                      action_chips: payload.action_chips || [],
                      rag_meta: payload.rag_meta || {},
                    }
                  : m
              )
            );
          } else if (payload.type === "token") {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempBotId ? { ...m, content: m.content + payload.token } : m))
            );
          }
        }
      }
      loadSessions();
    } catch {
      try {
        const fallback = await apiRequest<{ session_id: number; message: ChatMessage }>("/api/chat/message", {
          method: "POST",
          body: JSON.stringify({
            bot_type: botType,
            message: text,
            session_id: activeSessionId,
            use_personal_notes: sourceScope !== "institutional",
            source_scope: sourceScope,
          }),
        });
        setActiveSessionId(fallback.session_id);
        setMessages((prev) => prev.map((m) => (m.id === tempBotId ? fallback.message : m)));
        loadSessions();
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempBotId ? { ...m, content: err instanceof Error ? err.message : "Failed to reach RAG service." } : m
          )
        );
      }
    } finally {
      setSending(false);
    }
  };

  const totalIndexed = (ragIndex?.personal_chunks_count ?? 0) + (ragIndex?.institutional_chunks_count ?? 0);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="kpi-circle-icon" style={{ background: meta.color }}>
            <Icon size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.55rem" }}>{meta.name}</h1>
            <p style={{ margin: "2px 0 0", color: "var(--text-secondary)", fontSize: "0.86rem" }}>
              {meta.subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select
            className="select"
            style={{ width: "auto", padding: "7px 12px", fontSize: "0.82rem", fontWeight: 600 }}
            value={sourceScope}
            onChange={(e) => setSourceScope(e.target.value as "all" | "personal" | "institutional")}
            aria-label="RAG retrieval source scope"
          >
            <option value="all">RAG Scope: All Sources</option>
            <option value="personal">RAG Scope: My Notes Only</option>
            <option value="institutional">RAG Scope: Policies Only</option>
          </select>

          <button className="btn btn-white btn-sm" onClick={() => setShowRagDrawer(true)}>
            <Database size={14} color="var(--brand-purple)" /> RAG Index ({totalIndexed})
          </button>

          <button className="btn btn-gradient btn-sm" onClick={() => setShowIngest((v) => !v)}>
            <Plus size={14} /> Add Knowledge Source
          </button>
        </div>
      </div>

      {/* Inline Add-to-RAG Panel */}
      {showIngest && (
        <div className="card anim-fade-up" style={{ marginBottom: 16, borderColor: "var(--brand-purple)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={17} color="var(--brand-purple)" />
              <strong style={{ fontSize: "0.96rem" }}>Ingest Document Directly into Your Private RAG Index</strong>
            </div>
            <button className="icon-btn" onClick={() => setShowIngest(false)} aria-label="Close ingest panel"><X size={15} /></button>
          </div>

          <form onSubmit={handleQuickIngestText} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="input" style={{ flex: 2 }} required placeholder="Document / Lecture Title (e.g., Week 8 OS Deadlocks)" value={ingestTitle} onChange={(e) => setIngestTitle(e.target.value)} />
              <input className="input" style={{ width: 120 }} placeholder="Course" value={ingestCourse} onChange={(e) => setIngestCourse(e.target.value.toUpperCase())} />
              <label className="btn btn-white btn-sm" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Upload PDF / TXT / Image
                <input type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={handleQuickIngestFile} style={{ display: "none" }} />
              </label>
            </div>
            <textarea className="textarea" rows={3} required placeholder="Or paste lecture notes, syllabus, or paper excerpts here—chunked & embedded immediately for RAG..." value={ingestText} onChange={(e) => setIngestText(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <Shield size={12} style={{ verticalAlign: "-2px" }} /> Tenant-isolated: only your account can retrieve your personal chunks.
              </span>
              <button type="submit" className="btn btn-gradient btn-sm" disabled={ingesting}>
                {ingesting ? "Indexing..." : "Chunk & Index into RAG"}
              </button>
            </div>
          </form>
        </div>
      )}

      {statusBanner && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: "0.86rem", fontWeight: 600 }}>
          {statusBanner}
        </div>
      )}

      <div className="chat-shell">
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-gradient btn-sm" onClick={() => { setActiveSessionId(null); setMessages([]); }}>
            <Plus size={15} /> New Chat
          </button>
          <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginTop: 4 }}>
            RECENT SESSIONS ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Start a conversation to save your session history.
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openSession(s.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "9px 10px",
                  background: activeSessionId === s.id ? "rgba(123, 47, 247, 0.1)" : "var(--bg-subtle)",
                  cursor: "pointer",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.message_count} messages</div>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  style={{ background: "none", border: "none", color: "#dc2626", padding: 4 }}
                  aria-label="Delete session"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div className="kpi-circle-icon" style={{ background: meta.color, margin: "0 auto 12px", width: 52, height: 52 }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: "1.18rem" }}>Ask {meta.name} anything</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", maxWidth: 480, margin: "8px auto 18px" }}>
                  Currently indexing <strong>{ragIndex?.personal_chunks_count ?? 0} personal note chunks</strong> +{" "}
                  <strong>{ragIndex?.institutional_chunks_count ?? 0} university policy chunks</strong>.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520, margin: "0 auto" }}>
                  {meta.prompts.map((p) => (
                    <button key={p} className="btn btn-soft" style={{ justifyContent: "flex-start" }} onClick={() => sendMessage(p)}>
                      <Sparkles size={14} color={meta.color} /> {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isExpanded = expandedMsgId === m.id;
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                      {m.content || "Searching RAG index..."}
                    </div>

                    {m.role === "assistant" && (m.citations.length > 0 || m.rag_meta?.latency_ms !== undefined) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                          {m.rag_meta?.latency_ms !== undefined && (
                            <button
                              type="button"
                              className="badge badge-purple"
                              style={{ border: "none", cursor: "pointer" }}
                              onClick={() => setExpandedMsgId(isExpanded ? null : m.id)}
                            >
                              <Cpu size={12} /> RAG: {m.rag_meta.latency_ms}ms • {m.rag_meta.corpus_scanned ?? 0} chunks
                              <ChevronDown size={12} style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                            </button>
                          )}
                          {m.citations.map((c) => (
                            <span
                              key={c.chunk_id}
                              className="badge badge-blue"
                              style={{ cursor: "pointer" }}
                              onClick={() => setExpandedMsgId(isExpanded ? null : m.id)}
                              title={c.excerpt}
                            >
                              <BookOpen size={12} /> {c.title} ({Math.round(c.score * 100)}%)
                            </span>
                          ))}
                        </div>

                        {isExpanded && m.citations.length > 0 && (
                          <div className="card anim-fade-up" style={{ padding: 12, background: "var(--bg-subtle)" }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                              RETRIEVED RAG EVIDENCE (BM25 + DENSE COSINE)
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {m.citations.map((c) => (
                                <div key={c.chunk_id} style={{ padding: 10, borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                                    <span>{c.title} ({c.course_code})</span>
                                    <span style={{ color: "var(--brand-purple)" }}>Hybrid {Math.round(c.score * 100)}%</span>
                                  </div>
                                  <p style={{ margin: "0 0 6px", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{c.excerpt}</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    <span>BM25: {Math.round((c.bm25_score || 0) * 100)}%</span>
                                    <div className="rag-score-bar"><div className="rag-score-fill" style={{ width: `${Math.min(100, Math.round(c.score * 100))}%` }} /></div>
                                    <span>Cosine: {Math.round((c.cosine_score || 0) * 100)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {m.role === "assistant" && m.action_chips.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                        {m.action_chips.map((chip, idx) => (
                          <button key={idx} className="btn btn-white btn-sm" onClick={() => handleActionChip(chip)}>
                            <CalendarPlus size={13} color="var(--brand-purple)" /> {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ padding: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 10, background: "var(--bg-card)" }}
          >
            <input
              className="input"
              placeholder={`Ask ${meta.name} (searches ${totalIndexed} indexed RAG chunks)...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn btn-gradient" disabled={sending || !input.trim()}>
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      </div>

      {/* RAG Index Inspector Drawer */}
      {showRagDrawer && ragIndex && (
        <div className="drawer-backdrop" onClick={() => setShowRagDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={18} color="var(--brand-purple)" />
                <h3 style={{ fontSize: "1.06rem" }}>Live RAG Vector Index</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowRagDrawer(false)} aria-label="Close RAG inspector"><X size={16} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Personal Chunks</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-purple)" }}>{ragIndex.personal_chunks_count}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>University Chunks</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-blue)" }}>{ragIndex.institutional_chunks_count}</div>
              </div>
            </div>

            <h4 style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>YOUR PRIVATE NOTE CHUNKS</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {ragIndex.personal_sources.length === 0 ? (
                <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>No personal notes indexed yet.</p>
              ) : (
                ragIndex.personal_sources.map((c) => (
                  <div key={c.chunk_id} style={{ padding: 10, borderRadius: 10, background: "var(--bg-subtle)", fontSize: "0.8rem" }}>
                    <strong>{c.title}</strong> <span className="badge badge-blue">{c.course_code}</span>
                    <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>{c.preview}...</div>
                  </div>
                ))
              )}
            </div>

            <h4 style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>INSTITUTIONAL CORPUS CHUNKS</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ragIndex.institutional_sources.map((c) => (
                <div key={c.chunk_id} style={{ padding: 10, borderRadius: 10, background: "var(--bg-subtle)", fontSize: "0.8rem" }}>
                  <strong>{c.title}</strong> <span className="badge badge-purple">{c.course_code}</span>
                  <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>{c.preview}...</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
