import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileScan,
  Flame,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import type { AppRoute, CalendarEventItem, User } from "../types";

interface DashboardPageProps {
  user: User;
  searchQuery: string;
  onNavigate: (r: AppRoute) => void;
}

interface AnalyticsOverview {
  kpis: {
    notes_digitized: number;
    avg_quiz_score: number;
    routine_adherence: number;
    upcoming_deadlines: number;
    ai_sessions: number;
    study_streak_days: number;
  };
  recommendations: string[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, searchQuery, onNavigate }) => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCourse, setQuickCourse] = useState("CSC301");
  const [quickType, setQuickType] = useState<"assignment" | "exam" | "study">("assignment");

  const loadDashboard = async () => {
    try {
      const [cal, an] = await Promise.all([
        apiRequest<{ events: CalendarEventItem[] }>("/api/calendar/events"),
        apiRequest<AnalyticsOverview>("/api/analytics/overview"),
      ]);
      setEvents(cal.events);
      setAnalytics(an);
    } catch {
      // ignore transient errors
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await apiRequest("/api/calendar/events", {
      method: "POST",
      body: JSON.stringify({
        title: quickTitle.trim(),
        course_code: quickCourse.trim().toUpperCase() || "GENERAL",
        event_type: quickType,
        priority: quickType === "exam" ? "high" : "medium",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      }),
    });
    setQuickTitle("");
    loadDashboard();
  };

  const markTaskDone = async (id: number) => {
    await apiRequest(`/api/calendar/events/${id}`, {
      method: "PUT",
      body: JSON.stringify({ completed: true }),
    });
    loadDashboard();
  };

  const firstName = user.full_name.split(" ")[0];
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const filteredTasks = events
    .filter((e) => !e.completed)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.course_code.toLowerCase().includes(q);
    })
    .slice(0, 3);

  const cardStyles = [
    { cls: "task-card-red", iconBg: "#fee2e2", iconColor: "#dc2626", Icon: AlertCircle },
    { cls: "task-card-yellow", iconBg: "#fef3c7", iconColor: "#ca8a04", Icon: Clock },
    { cls: "task-card-green", iconBg: "#dcfce7", iconColor: "#16a34a", Icon: CheckCircle2 },
  ];

  const formatRelativeDate = (iso: string) => {
    const dt = new Date(iso);
    const diffDays = Math.round((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Hi {firstName}, here&apos;s your day.</h1>
        <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.92rem" }}>
          {todayFormatted} • {user.university_name} ({user.lms_platform}) • {user.major}
        </p>
      </div>

      {/* Inline Quick Add Task so users can immediately add their own real tasks */}
      <form
        onSubmit={handleQuickAdd}
        className="card"
        style={{ marginBottom: 22, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
      >
        <input
          className="input"
          style={{ flex: "2 1 220px" }}
          placeholder="Add a real task, assignment, or exam..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
        />
        <input
          className="input"
          style={{ width: 110 }}
          placeholder="Course"
          value={quickCourse}
          onChange={(e) => setQuickCourse(e.target.value.toUpperCase())}
        />
        <select
          className="select"
          style={{ width: 140 }}
          value={quickType}
          onChange={(e) => setQuickType(e.target.value as "assignment" | "exam" | "study")}
        >
          <option value="assignment">Assignment</option>
          <option value="exam">Exam</option>
          <option value="study">Study</option>
        </select>
        <button type="submit" className="btn btn-gradient btn-sm">
          <Plus size={15} /> Add Task
        </button>
      </form>

      <section style={{ marginBottom: 28 }}>
        <div className="section-heading-bar">
          <div className="section-heading-accent" />
          <h2 style={{ fontSize: "1.28rem", fontWeight: 700 }}>Top Priority Tasks</h2>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              No active deadlines yet. Use the bar above to add your real assignments, or import courses from Courses &amp; Sync.
            </p>
          </div>
        ) : (
          filteredTasks.map((task, idx) => {
            const style = cardStyles[idx % cardStyles.length];
            const Icon = style.Icon;
            return (
              <div key={task.id} className={`task-card ${style.cls}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: style.iconBg,
                      color: style.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{task.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} /> {formatRelativeDate(task.start_time)}
                      </span>
                      <span style={{ fontWeight: 600 }}>{task.course_code}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="task-pill">{task.event_type}</span>
                  <button className="btn btn-white btn-sm" onClick={() => markTaskDone(task.id)}>
                    Done
                  </button>
                </div>
              </div>
            );
          })
        )}

        {filteredTasks.length > 0 && (
          <div className="urgent-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>You have {analytics?.kpis.upcoming_deadlines ?? filteredTasks.length} upcoming deadline(s). Stay focused and manage your time wisely!</span>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => onNavigate("calendar")}>
              View Deadlines
            </button>
          </div>
        )}
      </section>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Notes Digitized</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4 }}>
                {analytics?.kpis.notes_digitized ?? 0}
              </div>
            </div>
            <div className="kpi-circle-icon" style={{ background: "#2563eb" }}><FileScan size={19} /></div>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>Indexed in Personal RAG</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Avg Quiz Score</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4 }}>
                {analytics?.kpis.avg_quiz_score ?? 0}%
              </div>
            </div>
            <div className="kpi-circle-icon" style={{ background: "#16a34a" }}><TrendingUp size={19} /></div>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>Live quiz mastery</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Routine Adherence</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4 }}>
                {analytics?.kpis.routine_adherence ?? 0}%
              </div>
            </div>
            <div className="kpi-circle-icon" style={{ background: "#d946ef" }}><Flame size={19} /></div>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--brand-purple)", fontWeight: 600 }}>
            AI sessions: {analytics?.kpis.ai_sessions ?? 0}
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Upcoming Tasks</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4 }}>
                {analytics?.kpis.upcoming_deadlines ?? 0}
              </div>
            </div>
            <div className="kpi-circle-icon" style={{ background: "#f97316" }}><Calendar size={19} /></div>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#ea580c", fontWeight: 600 }}>Synced with Calendar</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.06rem", marginBottom: 14 }}>Quick Academic Launchpad</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="btn btn-gradient" onClick={() => onNavigate("chat-uniq")}><Sparkles size={16} /> Ask UNIQ AI</button>
            <button className="btn btn-white" onClick={() => onNavigate("notes")}><FileScan size={16} /> Digitize Notes</button>
            <button className="btn btn-white" onClick={() => onNavigate("quizzes")}><BookOpen size={16} /> Start Quiz</button>
            <button className="btn btn-white" onClick={() => onNavigate("routine")}><Clock size={16} /> Smart Routine</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.06rem", marginBottom: 12 }}>AI Study Recommendations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(analytics?.recommendations || ["Add your courses and upload notes to get personalized study guidance."]).map((rec, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-subtle)", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
