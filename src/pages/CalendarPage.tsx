import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Download, Plus, Trash2, Wand2 } from "lucide-react";

import { apiRequest, downloadWithAuth } from "../lib/api";
import type { CalendarConflict, CalendarEventItem } from "../types";

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("CSC301");
  const [eventType, setEventType] = useState<"class" | "exam" | "assignment" | "study">("assignment");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("high");
  const [startTime, setStartTime] = useState(() => {
    const dt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return dt.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const dt = new Date(Date.now() + 25 * 60 * 60 * 1000);
    return dt.toISOString().slice(0, 16);
  });
  const [filterType, setFilterType] = useState<string>("all");

  const loadCalendar = async () => {
    const data = await apiRequest<{ events: CalendarEventItem[]; conflicts: CalendarConflict[] }>("/api/calendar/events");
    setEvents(data.events);
    setConflicts(data.conflicts);
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await apiRequest("/api/calendar/events", {
      method: "POST",
      body: JSON.stringify({
        title,
        course_code: courseCode,
        event_type: eventType,
        priority,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      }),
    });
    setTitle("");
    loadCalendar();
  };

  const toggleComplete = async (ev: CalendarEventItem) => {
    await apiRequest(`/api/calendar/events/${ev.id}`, {
      method: "PUT",
      body: JSON.stringify({ completed: !ev.completed }),
    });
    loadCalendar();
  };

  const resolveConflict = async (eventId: number) => {
    await apiRequest(`/api/calendar/events/${eventId}/resolve`, { method: "POST" });
    loadCalendar();
  };

  const deleteEvent = async (id: number) => {
    await apiRequest(`/api/calendar/events/${id}`, { method: "DELETE" });
    loadCalendar();
  };

  const visibleEvents = filterType === "all" ? events : events.filter((e) => e.event_type === filterType);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Smart Academic Calendar</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Color-coded classes, exams, and deadlines with overlap conflict detection, 1-click resolution, and .ics export.
          </p>
        </div>
        <button
          className="btn btn-white"
          onClick={() => downloadWithAuth("/api/calendar/export.ics", "edusmart-calendar.ics")}
        >
          <Download size={16} /> Export .ICS
        </button>
      </div>

      {conflicts.length > 0 && (
        <div className="urgent-banner" style={{ marginTop: 0, marginBottom: 20, flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span>{conflicts.length} Schedule Conflict(s) Detected</span>
          </div>
          {conflicts.map((c, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span>
                <strong>{c.event_a_title}</strong> overlaps with <strong>{c.event_b_title}</strong>
              </span>
              <button className="btn btn-white btn-sm" onClick={() => resolveConflict(c.event_b_id)}>
                <Wand2 size={14} /> Auto-Resolve Slot
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: "1.02rem", marginBottom: 12 }}>Add Academic Event</h3>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Title</label>
            <input className="input" required placeholder="e.g., Database Quiz 2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Course</label>
            <input className="input" value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Type</label>
            <select className="select" value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventItem["event_type"])}>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="class">Class</option>
              <option value="study">Study Block</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Priority</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as CalendarEventItem["priority"])}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Start</label>
            <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>End</label>
            <input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-gradient">
            <Plus size={16} /> Add Event
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["all", "assignment", "exam", "class", "study"].map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${filterType === t ? "btn-gradient" : "btn-soft"}`}
            onClick={() => setFilterType(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div>
        {visibleEvents.map((ev) => {
          const cardCls =
            ev.completed
              ? "task-card-green"
              : ev.priority === "high"
                ? "task-card-red"
                : ev.priority === "medium"
                  ? "task-card-yellow"
                  : "task-card-green";
          return (
            <div key={ev.id} className={`task-card ${cardCls}`} style={{ opacity: ev.completed ? 0.72 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  className="icon-btn"
                  onClick={() => toggleComplete(ev)}
                  title="Toggle complete"
                  aria-label="Toggle event completion"
                >
                  <CheckCircle2 size={18} color={ev.completed ? "#16a34a" : "var(--text-muted)"} />
                </button>
                <div>
                  <div style={{ fontWeight: 700, textDecoration: ev.completed ? "line-through" : "none" }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: 3 }}>
                    <Calendar size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                    {new Date(ev.start_time).toLocaleString()} • <strong>{ev.course_code}</strong> • source: {ev.source}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="task-pill">{ev.event_type}</span>
                <button className="icon-btn" onClick={() => deleteEvent(ev.id)} aria-label="Delete event">
                  <Trash2 size={15} color="#dc2626" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
