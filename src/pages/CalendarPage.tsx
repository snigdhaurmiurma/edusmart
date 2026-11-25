import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Download, List, LayoutGrid, Plus, Trash2, Wand2 } from "lucide-react";

import { apiRequest, downloadWithAuth } from "../lib/api";
import type { CalendarConflict, CalendarEventItem } from "../types";

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("CSC301");
  const [eventType, setEventType] = useState<"class" | "exam" | "assignment" | "study">("assignment");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("high");
  const [startTime, setStartTime] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(() => new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16));
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
    await apiRequest(`/api/calendar/events/${ev.id}`, { method: "PUT", body: JSON.stringify({ completed: !ev.completed }) });
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

  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayKey = dayKey(new Date());

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const eventsByDay: Record<string, CalendarEventItem[]> = {};
  for (const ev of events) {
    const k = dayKey(new Date(ev.start_time));
    (eventsByDay[k] ||= []).push(ev);
  }

  const visibleEvents = events.filter((e) => {
    if (filterType !== "all" && e.event_type !== filterType) return false;
    if (selectedDayKey && dayKey(new Date(e.start_time)) !== selectedDayKey) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Smart Academic Calendar</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Interactive Month Grid &amp; Agenda views with live overlap detection, 1-click slot resolution, and .ics export.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn btn-sm ${viewMode === "month" ? "btn-gradient" : "btn-white"}`} onClick={() => setViewMode("month")}>
            <LayoutGrid size={14} /> Month Grid
          </button>
          <button className={`btn btn-sm ${viewMode === "agenda" ? "btn-gradient" : "btn-white"}`} onClick={() => { setViewMode("agenda"); setSelectedDayKey(null); }}>
            <List size={14} /> Agenda
          </button>
          <button className="btn btn-white btn-sm" onClick={() => downloadWithAuth("/api/calendar/export.ics", "edusmart-calendar.ics")}>
            <Download size={14} /> .ICS
          </button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="urgent-banner" style={{ marginTop: 0, marginBottom: 20, flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span>{conflicts.length} Schedule Conflict(s) Detected</span>
          </div>
          {conflicts.map((c, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span><strong>{c.event_a_title}</strong> overlaps with <strong>{c.event_b_title}</strong></span>
              <button className="btn btn-white btn-sm" onClick={() => resolveConflict(c.event_b_id)}>
                <Wand2 size={14} /> Auto-Resolve Slot
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: "1.02rem", marginBottom: 12 }}>Add Academic Event</h3>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, alignItems: "end" }}>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Title</label><input className="input" required placeholder="e.g., OS Midterm" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Course</label><input className="input" value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase())} /></div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Type</label>
            <select className="select" value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventItem["event_type"])}>
              <option value="assignment">Assignment</option><option value="exam">Exam</option><option value="class">Class</option><option value="study">Study</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Priority</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as CalendarEventItem["priority"])}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Start</label><input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>End</label><input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          <button type="submit" className="btn btn-gradient"><Plus size={16} /> Add</button>
        </form>
      </div>

      {viewMode === "month" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button className="icon-btn" onClick={() => setMonthCursor(new Date(year, month - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <h3 style={{ fontSize: "1.15rem" }}>
              {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <button className="icon-btn" onClick={() => setMonthCursor(new Date(year, month + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>

          <div className="cal-month-grid" style={{ marginBottom: 8 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          <div className="cal-month-grid">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;
              const k = dayKey(cell);
              const dayEvs = eventsByDay[k] || [];
              return (
                <div
                  key={k}
                  className={`cal-day-cell ${k === todayKey ? "today" : ""} ${selectedDayKey === k ? "selected" : ""}`}
                  onClick={() => setSelectedDayKey(selectedDayKey === k ? null : k)}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: k === todayKey ? "var(--brand-blue)" : "var(--text-primary)" }}>
                    {cell.getDate()}
                  </div>
                  {dayEvs.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="cal-chip"
                      style={{
                        background: ev.priority === "high" ? "#fee2e2" : ev.priority === "medium" ? "#fef3c7" : "#dcfce7",
                        color: ev.priority === "high" ? "#991b1b" : ev.priority === "medium" ? "#92400e" : "#166534",
                      }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvs.length > 2 && <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>+{dayEvs.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "assignment", "exam", "class", "study"].map((t) => (
            <button key={t} className={`btn btn-sm ${filterType === t ? "btn-gradient" : "btn-soft"}`} onClick={() => setFilterType(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        {selectedDayKey && (
          <button className="btn btn-soft btn-sm" onClick={() => setSelectedDayKey(null)}>
            Showing {selectedDayKey} — Clear Filter
          </button>
        )}
      </div>

      <div>
        {visibleEvents.length === 0 ? (
          <div className="card"><p style={{ margin: 0, color: "var(--text-muted)" }}>No events match the current filter.</p></div>
        ) : (
          visibleEvents.map((ev) => {
            const cardCls = ev.completed ? "task-card-green" : ev.priority === "high" ? "task-card-red" : ev.priority === "medium" ? "task-card-yellow" : "task-card-green";
            return (
              <div key={ev.id} className={`task-card ${cardCls}`} style={{ opacity: ev.completed ? 0.72 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button className="icon-btn" onClick={() => toggleComplete(ev)} aria-label="Toggle event completion">
                    <CheckCircle2 size={18} color={ev.completed ? "#16a34a" : "var(--text-muted)"} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, textDecoration: ev.completed ? "line-through" : "none" }}>{ev.title}</div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: 3 }}>
                      <Calendar size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                      {new Date(ev.start_time).toLocaleString()} • <strong>{ev.course_code}</strong> • {ev.source}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="task-pill">{ev.event_type}</span>
                  <button className="icon-btn" onClick={() => deleteEvent(ev.id)} aria-label="Delete event"><Trash2 size={15} color="#dc2626" /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
