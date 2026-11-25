import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarPlus,
  FlaskConical,
  GraduationCap,
  Plus,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";

import { apiRequest, getStoredToken } from "../lib/api";
import type { ActionChip, AppRoute, ChatMessage, ChatSessionSummary } from "../types";

interface ChatPageProps {
  botType: "uniq" | "advisor" | "research";
  onNavigate: (r: AppRoute) => void;
}

const BOT_META = {
  uniq: {
    name: "UNIQ AI Assistant",
    subtitle: "Personalized university & course companion powered by Hybrid RAG",
    icon: Sparkles,
    color: "#7b2ff7",
    prompts: [
      "What are my upcoming deadlines and how should I prepare?",
      "Explain the university merit scholarship and tuition waiver policy.",
      "Summarize my CSC301 Dynamic Programming notes.",
    ],
  },
  advisor: {
    name: "Advisor Bot",
    subtitle: "Degree audit, prerequisite chains, and balanced next-term course planning",
    icon: GraduationCap,
    color: "#1d55c4",
    prompts: [
      "What courses should I take next trimester to graduate on time?",
      "Check my CSE core prerequisites and remaining credits.",
      "Build a balanced 12-credit schedule without lab conflicts.",
    ],
  },
  research: {
    name: "Research Bot",
    subtitle: "IEEE literature search strings, methodology checklists, and formatted citations",
    icon: FlaskConical,
    color: "#e000a8",
    prompts: [
      "Hybrid RAG evaluation benchmarks for university tutoring platforms",
      "Help me structure the methodology section for my CSE499 capstone paper",
      "Generate IEEE search strings for handwritten OCR in academic notes",
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
  const [usePersonalNotes, setUsePersonalNotes] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const list = await apiRequest<ChatSessionSummary[]>(`/api/chat/sessions?bot_type=${botType}`);
      setSessions(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
    setStatusBanner(null);
    loadSessions();
  }, [botType]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSession = async (id: number) => {
    setActiveSessionId(id);
    const data = await apiRequest<{ messages: ChatMessage[] }>(`/api/chat/sessions/${id}/messages`);
    setMessages(data.messages);
  };

  const handleActionChip = async (chip: ActionChip) => {
    if (chip.action === "add_calendar") {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await apiRequest("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: chip.payload.title || "AI Scheduled Study Block",
          event_type: chip.payload.event_type || "study",
          course_code: chip.payload.course_code || "CSC301",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          priority: "medium",
        }),
      });
      setStatusBanner("Added study block to your Smart Academic Calendar!");
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
      {
        id: tempUserId,
        role: "user",
        content: text,
        citations: [],
        action_chips: [],
        created_at: new Date().toISOString(),
      },
      {
        id: tempBotId,
        role: "assistant",
        content: "",
        citations: [],
        action_chips: [],
        created_at: new Date().toISOString(),
      },
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
          use_personal_notes: usePersonalNotes,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Stream unavailable");
      }

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
                  ? { ...m, citations: payload.citations || [], action_chips: payload.action_chips || [] }
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
      // Fallback to standard JSON endpoint if SSE is buffered by a proxy
      try {
        const fallback = await apiRequest<{ session_id: number; message: ChatMessage }>("/api/chat/message", {
          method: "POST",
          body: JSON.stringify({
            bot_type: botType,
            message: text,
            session_id: activeSessionId,
            use_personal_notes: usePersonalNotes,
          }),
        });
        setActiveSessionId(fallback.session_id);
        setMessages((prev) => prev.map((m) => (m.id === tempBotId ? fallback.message : m)));
        loadSessions();
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempBotId
              ? { ...m, content: err instanceof Error ? err.message : "Failed to reach AI service." }
              : m
          )
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="kpi-circle-icon" style={{ background: meta.color }}>
            <Icon size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.55rem" }}>{meta.name}</h1>
            <p style={{ margin: "2px 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              {meta.subtitle}
            </p>
          </div>
        </div>

        <label
          className="card"
          style={{
            padding: "8px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.84rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Shield size={15} color="var(--brand-purple)" />
          <input
            type="checkbox"
            checked={usePersonalNotes}
            onChange={(e) => setUsePersonalNotes(e.target.checked)}
          />
          Use Personal Notes (RAG)
        </label>
      </div>

      {statusBanner && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 14,
            fontSize: "0.88rem",
            fontWeight: 600,
          }}
        >
          {statusBanner}
        </div>
      )}

      <div className="chat-shell">
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn btn-gradient btn-sm"
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
          >
            <Plus size={15} /> New Chat
          </button>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginTop: 6 }}>
            RECENT SESSIONS
          </div>
          {sessions.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              No saved sessions yet. Ask a question to begin!
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "9px 10px",
                  background: activeSessionId === s.id ? "rgba(123, 47, 247, 0.1)" : "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.title}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {s.message_count} messages
                </div>
              </button>
            ))
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 20px" }}>
                <div className="kpi-circle-icon" style={{ background: meta.color, margin: "0 auto 12px", width: 52, height: 52 }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: "1.18rem" }}>Ask {meta.name} anything</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 460, margin: "8px auto 20px" }}>
                  Answers are grounded in your course notes and university policies with strict tenant isolation.
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
              messages.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                    {m.content || "..."}
                  </div>

                  {m.role === "assistant" && m.citations.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.citations.map((c) => (
                        <span key={c.chunk_id} className="badge badge-blue" title={c.excerpt}>
                          <BookOpen size={12} /> {c.title} ({Math.round(c.score * 100)}%)
                        </span>
                      ))}
                    </div>
                  )}

                  {m.role === "assistant" && m.action_chips.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                      {m.action_chips.map((chip, idx) => (
                        <button
                          key={idx}
                          className="btn btn-white btn-sm"
                          onClick={() => handleActionChip(chip)}
                        >
                          <CalendarPlus size={13} color="var(--brand-purple)" /> {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{
              padding: 14,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: 10,
              background: "var(--bg-card)",
            }}
          >
            <input
              className="input"
              placeholder={`Message ${meta.name}...`}
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
    </div>
  );
};
