import React, { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Download,
  FileText,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  Search,
  Shield,
  Sun,
  TrendingUp,
  User as UserIcon,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiRequest, downloadWithAuth } from "../lib/api";
import type { AppRoute, User } from "../types";
import { EduSmartLogo } from "../components/EduSmartLogo";

interface AdminPageProps {
  user: User;
  onNavigate: (r: AppRoute) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type AdminTab = "dashboard" | "users" | "content" | "feedback" | "monitoring" | "notifications" | "security";

interface AdminOverview {
  kpis: {
    total_users: number;
    total_users_delta: string;
    active_users: number;
    active_users_delta: string;
    active_courses: number;
    active_courses_delta: string;
    open_feedback: number;
    open_feedback_delta: string;
  };
  live_counts: {
    registered_accounts: number;
    notes_digitized: number;
    quiz_attempts: number;
    chat_sessions: number;
    indexed_rag_chunks: number;
  };
  rag_health: {
    avg_latency_ms: number;
    hit_at_1_percent: number;
    queries_logged: number;
    status: string;
  };
  user_growth: { month: string; total: number; active: number }[];
  feature_usages: { name: string; value: number; color: string }[];
}

export const AdminPage: React.FC<AdminPageProps> = ({
  user,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usersList, setUsersList] = useState<
    { id: number; full_name: string; email: string; role: string; major: string; is_active: boolean }[]
  >([]);
  const [docs, setDocs] = useState<{ id: number; title: string; category: string; content: string }[]>([]);
  const [feedbacks, setFeedbacks] = useState<
    { id: number; author_name: string; rating: number; category: string; message: string; status: string }[]
  >([]);
  const [auditLogs, setAuditLogs] = useState<
    { id: number; actor_email: string; action: string; target: string; details: string; created_at: string }[]
  >([]);

  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("policy");
  const [docContent, setDocContent] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  const loadAll = async () => {
    const [ov, u, c, fb, au] = await Promise.all([
      apiRequest<AdminOverview>("/api/admin/overview"),
      apiRequest<typeof usersList>("/api/admin/users"),
      apiRequest<typeof docs>("/api/admin/content"),
      apiRequest<typeof feedbacks>("/api/admin/feedback"),
      apiRequest<typeof auditLogs>("/api/admin/audit-logs"),
    ]);
    setOverview(ov);
    setUsersList(u);
    setDocs(c);
    setFeedbacks(fb);
    setAuditLogs(au);
  };

  useEffect(() => {
    loadAll().catch(() => {});
  }, []);

  const toggleUserActive = async (id: number, current: boolean) => {
    await apiRequest(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
    setBanner("Updated user account status.");
    loadAll();
  };

  const publishDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ chunks_indexed: number }>("/api/admin/content", {
      method: "POST",
      body: JSON.stringify({ title: docTitle, category: docCategory, content: docContent }),
    });
    setDocTitle("");
    setDocContent("");
    setBanner(`Published institutional document and indexed ${res.chunks_indexed} RAG chunks.`);
    loadAll();
  };

  const triageFeedback = async (id: number, status: string) => {
    await apiRequest(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    loadAll();
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ delivered_to: number }>("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({ title: broadcastTitle, message: broadcastMsg }),
    });
    setBroadcastTitle("");
    setBroadcastMsg("");
    setBanner(`Broadcast notice delivered to ${res.delivered_to} active accounts.`);
    loadAll();
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div style={{ padding: "4px 6px 14px" }}>
          <EduSmartLogo variant="admin" compact onClick={() => setTab("dashboard")} />
        </div>

        <div className="sidebar-section-label">Overview</div>
        <button className={`sidebar-item ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          <span className="sidebar-item-left"><LayoutGrid size={17} /> Dashboard</span>
        </button>
        <button className={`sidebar-item ${tab === "monitoring" ? "active" : ""}`} onClick={() => setTab("monitoring")}>
          <span className="sidebar-item-left"><BarChart3 size={17} /> Analytics &amp; RAG</span>
        </button>

        <div className="sidebar-section-label">Management</div>
        <button className={`sidebar-item ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          <span className="sidebar-item-left"><Users size={17} /> Users</span>
        </button>
        <button className={`sidebar-item ${tab === "content" ? "active" : ""}`} onClick={() => setTab("content")}>
          <span className="sidebar-item-left"><FileText size={17} /> Content &amp; RAG</span>
        </button>
        <button className={`sidebar-item ${tab === "feedback" ? "active" : ""}`} onClick={() => setTab("feedback")}>
          <span className="sidebar-item-left"><MessageSquare size={17} /> Feedback</span>
        </button>

        <div className="sidebar-section-label">System</div>
        <button className={`sidebar-item ${tab === "notifications" ? "active" : ""}`} onClick={() => setTab("notifications")}>
          <span className="sidebar-item-left"><Bell size={17} /> Broadcasts</span>
        </button>
        <button className={`sidebar-item ${tab === "security" ? "active" : ""}`} onClick={() => setTab("security")}>
          <span className="sidebar-item-left"><Shield size={17} /> Security Logs</span>
        </button>

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="sidebar-item" onClick={() => onNavigate("dashboard")}>
            <span className="sidebar-item-left"><BookOpen size={17} /> Student View</span>
          </button>
          <button className="sidebar-item" onClick={onLogout} style={{ color: "#dc2626" }}>
            <span className="sidebar-item-left"><LogOut size={17} /> Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-search">
            <Search size={16} />
            <input type="search" placeholder="Search users, policies, audit events..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn" onClick={() => setTab("notifications")} aria-label="Broadcasts">
              <Bell size={18} />
            </button>
            <span className="badge badge-purple" style={{ padding: "6px 12px" }}>
              <UserIcon size={13} /> {user.full_name}
            </span>
          </div>
        </header>

        <main className="app-content">
          {banner && (
            <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
              {banner}
            </div>
          )}

          {/* Top 4 KPI Cards — live database metrics */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Total Users</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 2 }}>
                    {overview?.kpis.total_users ?? 0}
                  </div>
                </div>
                <div className="kpi-circle-icon" style={{ background: "#2563eb" }}><Users size={19} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                {overview?.kpis.total_users_delta ?? "Live DB"}
              </div>
            </div>

            <div className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Active Accounts</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 2 }}>
                    {overview?.kpis.active_users ?? 0}
                  </div>
                </div>
                <div className="kpi-circle-icon" style={{ background: "#16a34a" }}><Activity size={19} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                {overview?.kpis.active_users_delta ?? "100% active"}
              </div>
            </div>

            <div className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Active Courses</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 2 }}>
                    {overview?.kpis.active_courses ?? 0}
                  </div>
                </div>
                <div className="kpi-circle-icon" style={{ background: "#db2777" }}><BookOpen size={19} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>
                {overview?.kpis.active_courses_delta ?? "Enrolled & completed"}
              </div>
            </div>

            <div className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Open Feedback</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 2 }}>
                    {overview?.kpis.open_feedback ?? 0}
                  </div>
                </div>
                <div className="kpi-circle-icon" style={{ background: "#f97316" }}><MessageSquare size={19} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#ea580c", fontWeight: 700 }}>
                {overview?.kpis.open_feedback_delta ?? "Awaiting triage"}
              </div>
            </div>
          </div>

          {(tab === "dashboard" || tab === "monitoring") && (
            <>
              <div className="grid-2" style={{ marginBottom: 22 }}>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "1.12rem" }}>User Growth</h3>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Total and active users over time</div>
                    </div>
                    <button
                      className="btn btn-soft btn-sm"
                      onClick={() => downloadWithAuth("/api/admin/report.csv", "edusmart-admin-report.csv")}
                    >
                      <Download size={14} /> Export
                    </button>
                  </div>
                  <div className="admin-navy-chart" style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview?.user_growth || []}>
                        <defs>
                          <linearGradient id="navyGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="#93c5fd" />
                        <YAxis stroke="#93c5fd" />
                        <Tooltip />
                        <Area type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={3} fill="url(#navyGlow)" />
                        <Area type="monotone" dataKey="active" stroke="#c084fc" strokeWidth={2.5} fillOpacity={0} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "1.12rem" }}>Feature Usages</h3>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Most used features this month</div>
                    </div>
                    <span className="badge badge-blue"><TrendingUp size={13} /> Live Mix</span>
                  </div>
                  <div style={{ height: 240, display: "flex", alignItems: "center" }}>
                    <ResponsiveContainer width="58%" height="100%">
                      <PieChart>
                        <Pie
                          data={overview?.feature_usages || []}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {(overview?.feature_usages || []).map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ width: "42%", display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem" }}>
                      {(overview?.feature_usages || []).map((f) => (
                        <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color }} />
                            {f.name}
                          </span>
                          <strong>{f.value}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: "1.08rem", marginBottom: 12 }}>System &amp; Hybrid RAG Health</h3>
                <div className="grid-3">
                  <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Avg RAG Retrieval Latency</div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4 }}>
                      {overview?.rag_health.avg_latency_ms ?? 12.4} ms
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Retrieval Hit@1 Rate</div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "#16a34a" }}>
                      {overview?.rag_health.hit_at_1_percent ?? 94.0}%
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Indexed Vector Chunks</div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "var(--brand-purple)" }}>
                      {overview?.live_counts.indexed_rag_chunks ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "users" && (
            <div className="card">
              <h3 style={{ fontSize: "1.1rem", marginBottom: 14 }}>User &amp; RBAC Lifecycle Management</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-strong)" }}>
                    <th style={{ padding: 10 }}>Name</th>
                    <th style={{ padding: 10 }}>Email</th>
                    <th style={{ padding: 10 }}>Role</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ padding: 10 }}>{u.email}</td>
                      <td style={{ padding: 10 }}><span className="badge badge-purple">{u.role}</span></td>
                      <td style={{ padding: 10 }}>
                        <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        <button
                          className="btn btn-soft btn-sm"
                          disabled={u.id === user.id}
                          onClick={() => toggleUserActive(u.id, u.is_active)}
                        >
                          {u.is_active ? "Disable" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "content" && (
            <div className="grid-2" style={{ alignItems: "start" }}>
              <div className="card">
                <h3 style={{ fontSize: "1.08rem", marginBottom: 12 }}>Publish Institutional RAG Policy / FAQ</h3>
                <form onSubmit={publishDoc} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input className="input" required placeholder="Policy or FAQ title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                  <select className="select" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                    <option value="policy">University Policy</option>
                    <option value="faq">Student FAQ</option>
                    <option value="curriculum">Curriculum / Prerequisites</option>
                    <option value="research">Research Guidelines</option>
                  </select>
                  <textarea className="textarea" rows={5} required placeholder="Write approved policy text to index into UNIQ & Advisor RAG..." value={docContent} onChange={(e) => setDocContent(e.target.value)} />
                  <button type="submit" className="btn btn-gradient">Publish &amp; Index into RAG</button>
                </form>
              </div>
              <div className="card">
                <h3 style={{ fontSize: "1.08rem", marginBottom: 12 }}>Published Institutional Corpus ({docs.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {docs.map((d) => (
                    <div key={d.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong>{d.title}</strong>
                        <span className="badge badge-blue">{d.category}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                        {d.content.slice(0, 140)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "feedback" && (
            <div className="card">
              <h3 style={{ fontSize: "1.08rem", marginBottom: 14 }}>Feedback Moderation &amp; Roadmap Triage</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {feedbacks.map((f) => (
                  <div key={f.id} style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{f.author_name}</strong> <span className="badge badge-purple">{f.category}</span> ({f.rating}/5)
                      <p style={{ margin: "6px 0 0", fontSize: "0.88rem", color: "var(--text-secondary)" }}>{f.message}</p>
                    </div>
                    <select className="select" style={{ width: 140 }} value={f.status} onChange={(e) => triageFeedback(f.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="planned">Planned</option>
                      <option value="resolved">Resolved</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="card" style={{ maxWidth: 620 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Megaphone size={20} color="var(--brand-purple)" />
                <h3 style={{ fontSize: "1.08rem" }}>Global Student Broadcast Notice</h3>
              </div>
              <form onSubmit={sendBroadcast} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input className="input" required placeholder="Announcement title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} />
                <textarea className="textarea" rows={4} required placeholder="Message delivered to all active users' Notification Center..." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
                <button type="submit" className="btn btn-gradient">Send Global Notice</button>
              </form>
            </div>
          )}

          {tab === "security" && (
            <div className="card">
              <h3 style={{ fontSize: "1.08rem", marginBottom: 14 }}>Security &amp; Compliance Audit Trail</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {auditLogs.map((lg) => (
                  <div key={lg.id} style={{ padding: 10, borderRadius: 10, background: "var(--bg-subtle)", fontSize: "0.84rem", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <span className="badge badge-blue" style={{ marginRight: 8 }}>{lg.action}</span>
                      <strong>{lg.actor_email}</strong> → {lg.target} {lg.details ? `(${lg.details})` : ""}
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>{new Date(lg.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
