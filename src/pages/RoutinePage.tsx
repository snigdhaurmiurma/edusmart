import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Flame, Moon, Sparkles, Sun, Sunset } from "lucide-react";

import { apiRequest } from "../lib/api";
import type { RoutineResponse } from "../types";

export const RoutinePage: React.FC = () => {
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [wakeHour, setWakeHour] = useState(7);
  const [sleepHour, setSleepHour] = useState(23);
  const [focusWindow, setFocusWindow] = useState<"morning" | "afternoon" | "evening">("morning");
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [studyHours, setStudyHours] = useState(4);
  const [loading, setLoading] = useState(false);

  const loadRoutine = async () => {
    const data = await apiRequest<RoutineResponse>("/api/routine");
    setRoutine(data);
  };

  useEffect(() => {
    loadRoutine();
  }, []);

  const regenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest<RoutineResponse>("/api/routine/generate", {
        method: "POST",
        body: JSON.stringify({
          wake_hour: wakeHour,
          sleep_hour: sleepHour,
          focus_window: focusWindow,
          break_minutes: breakMinutes,
          study_hours_target: studyHours,
        }),
      });
      setRoutine(data);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (id: number) => {
    const updated = await apiRequest<RoutineResponse>(`/api/routine/${id}/toggle`, { method: "PATCH" });
    setRoutine(updated);
  };

  const periods = [
    { key: "morning", label: "Morning Focus", Icon: Sun, color: "#f59e0b" },
    { key: "afternoon", label: "Afternoon Practice", Icon: Sunset, color: "#7b2ff7" },
    { key: "evening", label: "Evening Mastery", Icon: Moon, color: "#2563eb" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Intelligent Routine Generator</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Balances your fixed classes, urgent deadlines, focus window, and weak quiz topics into time-boxed study blocks.
          </p>
        </div>

        {routine && (
          <div style={{ display: "flex", gap: 10 }}>
            <span className="badge badge-purple" style={{ padding: "7px 14px", fontSize: "0.85rem" }}>
              <Flame size={15} /> {routine.streak_days}-Day Streak
            </span>
            <span className="badge badge-green" style={{ padding: "7px 14px", fontSize: "0.85rem" }}>
              {routine.completed_count}/{routine.total_count} Done ({routine.completion_rate}%)
            </span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <form onSubmit={regenerate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Wake Hour</label>
            <input className="input" type="number" min={4} max={12} value={wakeHour} onChange={(e) => setWakeHour(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Sleep Hour</label>
            <input className="input" type="number" min={18} max={24} value={sleepHour} onChange={(e) => setSleepHour(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Peak Focus Window</label>
            <select className="select" value={focusWindow} onChange={(e) => setFocusWindow(e.target.value as "morning" | "afternoon" | "evening")}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Break (min)</label>
            <input className="input" type="number" min={5} max={45} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Study Target (hrs)</label>
            <input className="input" type="number" min={1} max={10} value={studyHours} onChange={(e) => setStudyHours(Number(e.target.value))} />
          </div>
          <button type="submit" className="btn btn-gradient" disabled={loading}>
            <Sparkles size={15} /> {loading ? "Building..." : "Regenerate Plan"}
          </button>
        </form>
      </div>

      <div className="grid-3">
        {periods.map(({ key, label, Icon, color }) => {
          const blocks = (routine?.blocks || []).filter((b) => b.period === key);
          return (
            <div key={key} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div className="kpi-circle-icon" style={{ background: color, width: 34, height: 34 }}>
                  <Icon size={17} />
                </div>
                <h3 style={{ fontSize: "1.05rem" }}>{label}</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => toggleBlock(b.id)}
                    style={{
                      padding: 13,
                      borderRadius: 12,
                      background: b.completed ? "var(--green-bg)" : "var(--bg-subtle)",
                      borderLeft: `4px solid ${b.completed ? "#22c55e" : color}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {b.start_label} – {b.end_label}
                      </span>
                      <CheckCircle2 size={16} color={b.completed ? "#16a34a" : "var(--text-muted)"} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", textDecoration: b.completed ? "line-through" : "none" }}>
                      {b.title}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span className="badge badge-blue">{b.course_code}</span>
                      <span className="badge badge-purple">{b.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
