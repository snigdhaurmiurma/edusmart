import React, { useEffect, useState } from "react";
import { Building2, Calendar, CheckCircle2, Database, Globe, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

import { apiRequest } from "../lib/api";
import type { User } from "../types";

interface SyncPageProps {
  user: User;
  onUserUpdated: (u: User) => void;
}

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

export const SyncPage: React.FC<SyncPageProps> = ({ user, onUserUpdated }) => {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Universal University Setup + Handbook-to-RAG
  const [uniName, setUniName] = useState(user.university_name || "My University");
  const [lmsPlatform, setLmsPlatform] = useState(user.lms_platform || "Manual / Universal");
  const [handbookTitle, setHandbookTitle] = useState("");
  const [handbookText, setHandbookText] = useState("");

  // Manual Course Form
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [credits, setCredits] = useState(3);
  const [schedule, setSchedule] = useState("Mon/Wed 10:00 AM");
  const [courseStatus, setCourseStatus] = useState<"enrolled" | "completed">("enrolled");

  // Manual Assignment Form
  const [assignCourse, setAssignCourse] = useState("CSC301");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDue, setAssignDue] = useState(() => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const load = async () => {
    const res = await apiRequest<SyncStatusData>("/api/sync/status");
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  const saveUniversitySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const res = await apiRequest<{ university_name: string; lms_platform: string; message: string }>("/api/sync/university-info", {
      method: "POST",
      body: JSON.stringify({
        university_name: uniName,
        lms_platform: lmsPlatform,
        handbook_title: handbookTitle || undefined,
        handbook_text: handbookText || undefined,
      }),
    });
    onUserUpdated({ ...user, university_name: res.university_name, lms_platform: res.lms_platform });
    setHandbookTitle("");
    setHandbookText("");
    setBanner(res.message);
  };

  const handleIcsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing("ics");
    setBanner(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiRequest<{ message: string }>("/api/sync/import-ics", { method: "POST", body: form });
      setBanner(res.message);
      await load();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Failed to import .ics file.");
    } finally {
      setSyncing(null);
      e.target.value = "";
    }
  };

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
        status: courseStatus,
      }),
    });
    setCode("");
    setTitle("");
    setInstructor("");
    setBanner("Added course to your academic profile.");
    load();
  };

  const toggleCourseStatus = async (c: SyncStatusData["courses"][0]) => {
    const nextStatus = c.status === "enrolled" ? "completed" : "enrolled";
    await apiRequest(`/api/sync/courses/${c.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus, grade: nextStatus === "completed" ? c.grade || "A" : null }),
    });
    load();
  };

  const removeCourse = async (id: number) => {
    await apiRequest(`/api/sync/courses/${id}`, { method: "DELETE" });
    load();
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;
    await apiRequest("/api/sync/assignments", {
      method: "POST",
      body: JSON.stringify({ course_code: assignCourse.trim().toUpperCase() || "GENERAL", title: assignTitle.trim(), due_at: new Date(assignDue).toISOString() }),
    });
    setAssignTitle("");
    setBanner("Added assignment and synced deadline into Smart Academic Calendar.");
    load();
  };

  const toggleAssignment = async (id: number) => {
    await apiRequest(`/api/sync/assignments/${id}/toggle`, { method: "PATCH" });
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
          <h1 style={{ fontSize: "1.65rem" }}>My University, Courses &amp; Portal Sync</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Works for any university worldwide: configure your university handbook for RAG, add courses manually, import .ics calendars, or sync UCAM &amp; ELMS.
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

      {/* Universal University Info & Handbook-to-RAG Card */}
      <div className="card" style={{ marginBottom: 18, borderColor: "rgba(123, 47, 247, 0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="kpi-circle-icon" style={{ background: "var(--brand-purple)", width: 36, height: 36 }}><Globe size={18} /></div>
          <div>
            <h3 style={{ fontSize: "1.06rem" }}>Your University &amp; Custom Knowledge Base (RAG)</h3>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Tell EduSmart about your university &amp; paste policies/syllabus so UNIQ &amp; Advisor bots answer specifically for YOUR campus.
            </div>
          </div>
        </div>
        <form onSubmit={saveUniversitySetup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>University Name</label>
              <input className="input" required value={uniName} onChange={(e) => setUniName(e.target.value)} placeholder="e.g., United International University, MIT, BUET..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Campus LMS / Portal</label>
              <select className="select" value={lmsPlatform} onChange={(e) => setLmsPlatform(e.target.value)}>
                <option value="Manual / Universal">Manual / Universal</option>
                <option value="UCAM / ELMS">UCAM / ELMS</option>
                <option value="Canvas LMS">Canvas LMS</option>
                <option value="Moodle">Moodle</option>
                <option value="Blackboard">Blackboard</option>
                <option value="Google Classroom">Google Classroom</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Handbook / Policy Title (optional)</label>
              <input className="input" value={handbookTitle} onChange={(e) => setHandbookTitle(e.target.value)} placeholder="e.g., Grading Policy & Prerequisites" />
            </div>
          </div>
          <textarea
            className="textarea"
            rows={2}
            value={handbookText}
            onChange={(e) => setHandbookText(e.target.value)}
            placeholder="(Optional) Paste your university's grading rules, scholarship criteria, exam policies, or degree catalog here to index into RAG..."
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-gradient btn-sm">
              <Building2 size={14} /> Save University &amp; Index into RAG
            </button>
          </div>
        </form>
      </div>

      {/* Portal Integrations: UCAM, ELMS & Universal .ICS Import */}
      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#2563eb", width: 36, height: 36 }}><Database size={17} /></div>
              <div><h3 style={{ fontSize: "0.96rem" }}>UCAM Portal</h3><div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Courses &amp; credits</div></div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("ucam")} disabled={!!syncing}>Sync</button>
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#a855f7", width: 36, height: 36 }}><CheckCircle2 size={17} /></div>
              <div><h3 style={{ fontSize: "0.96rem" }}>ELMS Portal</h3><div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Deadlines &amp; tasks</div></div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("elms")} disabled={!!syncing}>Sync</button>
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#16a34a", width: 36, height: 36 }}><Calendar size={17} /></div>
              <div><h3 style={{ fontSize: "0.96rem" }}>Any LMS (.ICS)</h3><div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Canvas / Moodle / Google</div></div>
            </div>
            <label className="btn btn-white btn-sm" style={{ cursor: "pointer" }}>
              <Upload size={13} /> Import
              <input type="file" accept=".ics" onChange={handleIcsUpload} style={{ display: "none" }} />
            </label>
          </div>
        </div>
      </div>

      {/* Add Manual Course */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: "1.02rem", marginBottom: 12 }}>Add Any Course Manually</h3>
        <form onSubmit={addCourse} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 10, alignItems: "end" }}>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Code</label><input className="input" required placeholder="CSE415" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Course Title</label><input className="input" required placeholder="Distributed Systems" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Instructor</label><input className="input" placeholder="Prof. Name" value={instructor} onChange={(e) => setInstructor(e.target.value)} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Credits</label><input className="input" type="number" min={1} max={6} value={credits} onChange={(e) => setCredits(Number(e.target.value))} /></div>
          <div><label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Schedule</label><input className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)} /></div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Status</label>
            <select className="select" value={courseStatus} onChange={(e) => setCourseStatus(e.target.value as "enrolled" | "completed")}>
              <option value="enrolled">Enrolled</option><option value="completed">Completed</option>
            </select>
          </div>
          <button type="submit" className="btn btn-gradient"><Plus size={15} /> Add</button>
        </form>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>My Courses ({data?.courses.length ?? 0})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data?.courses.map((c) => (
              <div key={c.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.code} — {c.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{c.instructor} • {c.schedule} • {c.credits} cr</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="btn btn-white btn-sm" onClick={() => toggleCourseStatus(c)}>
                    {c.status === "completed" ? `Done (${c.grade || "A"})` : "Enrolled"}
                  </button>
                  <button className="icon-btn" onClick={() => removeCourse(c.id)} aria-label="Remove course"><Trash2 size={14} color="#dc2626" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Assignments ({data?.assignments.length ?? 0})</h3>
          <form onSubmit={addAssignment} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <input className="input" style={{ width: 90 }} value={assignCourse} onChange={(e) => setAssignCourse(e.target.value.toUpperCase())} placeholder="Course" />
            <input className="input" style={{ flex: 1, minWidth: 130 }} required placeholder="New assignment..." value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} />
            <input className="input" style={{ width: 170 }} type="datetime-local" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
            <button type="submit" className="btn btn-white btn-sm"><Plus size={14} /> Add</button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {data?.assignments.map((a) => (
              <div key={a.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", textDecoration: a.status === "submitted" ? "line-through" : "none" }}>{a.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{a.course_code} • Due {new Date(a.due_at).toLocaleDateString()}</div>
                </div>
                <button className={`btn btn-sm ${a.status === "submitted" ? "btn-soft" : "btn-white"}`} onClick={() => toggleAssignment(a.id)}>
                  {a.status === "submitted" ? "Submitted ✓" : "Mark Submitted"}
                </button>
              </div>
            ))}
          </div>
          {data?.logs.slice(0, 3).map((lg) => (
            <div key={lg.id} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <strong>{lg.provider.toUpperCase()}</strong> — {lg.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
