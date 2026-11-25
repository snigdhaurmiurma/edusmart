import React, { useEffect, useState } from "react";
import { CheckCircle2, Database, RefreshCw } from "lucide-react";

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

  const load = async () => {
    const res = await apiRequest<SyncStatusData>("/api/sync/status");
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  const trigger = async (provider: "ucam" | "elms" | "all") => {
    setSyncing(provider);
    setBanner(null);
    try {
      const res = await apiRequest<{ message: string }>(`/api/sync/trigger?provider=${provider}`, {
        method: "POST",
      });
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
          <h1 style={{ fontSize: "1.65rem" }}>UCAM &amp; ELMS System Sync</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Import enrolled courses, prerequisites, and ELMS assignments directly into Smart Calendar and Advisor Bot.
          </p>
        </div>
        <button className="btn btn-gradient" onClick={() => trigger("all")} disabled={!!syncing}>
          <RefreshCw size={16} /> {syncing === "all" ? "Syncing..." : "Sync All Now"}
        </button>
      </div>

      {banner && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: "0.88rem" }}>
          {banner}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#2563eb" }}><Database size={18} /></div>
              <div>
                <h3 style={{ fontSize: "1.05rem" }}>UCAM Academic Portal</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Courses, credits, schedules &amp; completed grades</div>
              </div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("ucam")} disabled={!!syncing}>
              Sync UCAM
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kpi-circle-icon" style={{ background: "#a855f7" }}><CheckCircle2 size={18} /></div>
              <div>
                <h3 style={{ fontSize: "1.05rem" }}>ELMS Course Delivery</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Assignments, exam deadlines &amp; study packs</div>
              </div>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => trigger("elms")} disabled={!!syncing}>
              Sync ELMS
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Synced Courses ({data?.courses.length ?? 0})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data?.courses.map((c) => (
              <div key={c.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.code} — {c.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {c.instructor} • {c.schedule} • {c.credits} cr
                  </div>
                </div>
                <span className={`badge ${c.status === "completed" ? "badge-green" : "badge-blue"}`}>
                  {c.grade ? `${c.status} (${c.grade})` : c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Synced Assignments &amp; Sync Logs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {data?.assignments.map((a) => (
              <div key={a.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{a.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {a.course_code} • Due {new Date(a.due_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="badge badge-amber">{a.status}</span>
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 8 }}>Recent Sync Health</h4>
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
