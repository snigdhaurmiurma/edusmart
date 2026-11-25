import React, { useEffect, useState } from "react";
import { CheckCircle2, Database, Plus, RefreshCw, Trash2 } from "lucide-react";

import { apiRequest } from "../lib/api";

interface SyncStatusData {
  consent_enabled: boolean;
  last_sync_at: string | null;
  courses: {
    id: number;
    code: string;
    title: string;
    instructor: string;
    credits: number;
    schedule: string;
    status: string;
    grade: string | null;
  }[];
  assignments: {
    id: number;
    course_code: string;
    title: string;
    due_at: string;
    status: string;
  }[];
  logs: {
    id: number;
    provider: string;
    status: string;
    items_synced: number;
    message: string;
    created_at: string;
  }[];
}

export const SyncPage: React.FC = () => {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [credits, setCredits] = useState(3);
  const [schedule, setSchedule] = useState("Mon/Wed 10:00 AM");

  const load = async () => {
    const res = await apiRequest<SyncStatusData>("/api/sync/status");
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;
    await apiRequest("/api/sync/courses", {
      method: "POST",
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        instructor: instructor.trim() || "Faculty",
        credits,
        schedule,
      }),
    });
    setCode("");
    setTitle("");
    setInstructor("");
    setBanner("Added course to your academic profile.");
    load();
  };

  const removeCourse = async (id: number) => {
    await apiRequest(`/api/sync/courses/${id}`, { method: "DELETE" });
    load();
  };

  const trigger = async (provider: "ucam" | "elms" | "all") => {
    setSyncing(provider);
    setBanner(null);
    try {
      const res = await apiRequest<{ message: string }>(`/api/sync/trigger?provider=${provider}`, { method: "POST" });
      setBanner(res.message);
      await load();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Courses &amp; UCAM / ELMS Sync</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Add your real university courses manually or sync schedules and assignments from UCAM &amp; ELMS.
          </p>
        </div>
        <button className="btn btn-gradient" onClick={() => trigger("all")} disabled={!!syncing}>
          <RefreshCw size={16} /> {syncing === "all" ? "Syncing..." : "Sync UCAM & ELMS"}
        </button>
      </div>

      {banner && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: "0.88rem" }}>
          {banner}
        </div>
      )}

      {/* Real Add Course Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: "1.02rem", marginBottom: 12 }}>Add Your Course</h3>
        <form onSubmit={addCourse} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Course Code</label>
            <input className="input" required placeholder="e.g., CSE415" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Course Title</label>
            <input className="input" required placeholder="Distributed Systems" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Instructor</label>
            <input className="input" placeholder="Dr. Name" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Credits</label>
            <input className="input" type="number" min={1} max={6} value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Schedule</label>
            <input className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-gradient">
            <Plus size={15} /> Add Course
          </button>
        </form>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#2563eb" }}><Database size={18} /></div>
              <div>
                <h3 style={{ fontSize: "1.05rem" }}>UCAM Portal</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Course enrollments, credits &amp; schedules</div>
              </div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("ucam")} disabled={!!syncing}>Sync UCAM</button>
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#a855f7" }}><CheckCircle2 size={18} /></div>
              <div>
                <h3 style={{ fontSize: "1.05rem" }}>ELMS Portal</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Assignments &amp; Smart Calendar deadlines</div>
              </div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("elms")} disabled={!!syncing}>Sync ELMS</button>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>My Courses ({data?.courses.length ?? 0})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data?.courses.map((c) => (
              <div key={c.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.code} — {c.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {c.instructor} • {c.schedule} • {c.credits} cr
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${c.status === "completed" ? "badge-green" : "badge-blue"}`}>
                    {c.grade ? `${c.status} (${c.grade})` : c.status}
                  </span>
                  <button className="icon-btn" onClick={() => removeCourse(c.id)} aria-label="Remove course">
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Synced Assignments &amp; Logs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {data?.assignments.map((a) => (
              <div key={a.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{a.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.course_code} • Due {new Date(a.due_at).toLocaleDateString()}</div>
                </div>
                <span className="badge badge-amber">{a.status}</span>
              </div>
            ))}
          </div>
          {data?.logs.slice(0, 4).map((lg) => (
            <div key={lg.id} style={{ fontSize: "0.82rem", color: "var(--text-secondary)", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <strong>{lg.provider.toUpperCase()}</strong> — {lg.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
