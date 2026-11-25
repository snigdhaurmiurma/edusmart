import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCheck,
  Clock,
  FileScan,
  FlaskConical,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  ThumbsUp,
  User as UserIcon,
  X,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import type { AppRoute, NotificationItem, User } from "../types";
import { EduSmartLogo } from "./EduSmartLogo";

interface LayoutProps {
  user: User;
  route: AppRoute;
  onNavigate: (r: AppRoute) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  route,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await apiRequest<{ unread_count: number; items: NotificationItem[] }>("/api/notifications");
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [route]);

  const markAllRead = async () => {
    await apiRequest("/api/notifications/read-all", { method: "POST" });
    loadNotifications();
  };

  const navClick = (r: AppRoute) => {
    onNavigate(r);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "4px 6px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <EduSmartLogo variant="student" compact onClick={() => navClick("dashboard")} />
          <button
            className="icon-btn mobile-menu-btn"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <button
          className={`sidebar-item ${route === "dashboard" ? "active" : ""}`}
          onClick={() => navClick("dashboard")}
        >
          <span className="sidebar-item-left">
            <Home size={18} /> Dashboard
          </span>
        </button>

        <div className="sidebar-section-label">AI CHATBOTS</div>
        <button
          className={`sidebar-item ${route === "chat-uniq" ? "active" : ""}`}
          onClick={() => navClick("chat-uniq")}
        >
          <span className="sidebar-item-left">
            <Sparkles size={17} /> UNIQ Assistant
          </span>
          <span className="badge-ai">AI</span>
        </button>
        <button
          className={`sidebar-item ${route === "chat-advisor" ? "active" : ""}`}
          onClick={() => navClick("chat-advisor")}
        >
          <span className="sidebar-item-left">
            <GraduationCap size={17} /> Advisor Bot
          </span>
          <span className="badge-ai">AI</span>
        </button>
        <button
          className={`sidebar-item ${route === "chat-research" ? "active" : ""}`}
          onClick={() => navClick("chat-research")}
        >
          <span className="sidebar-item-left">
            <FlaskConical size={17} /> Research Bot
          </span>
          <span className="badge-ai">AI</span>
        </button>

        <div className="sidebar-section-label">AI TOOLS</div>
        <button
          className={`sidebar-item ${route === "notes" ? "active" : ""}`}
          onClick={() => navClick("notes")}
        >
          <span className="sidebar-item-left">
            <FileScan size={17} /> Notes Digitizer
          </span>
        </button>
        <button
          className={`sidebar-item ${route === "quizzes" ? "active" : ""}`}
          onClick={() => navClick("quizzes")}
        >
          <span className="sidebar-item-left">
            <BookOpen size={17} /> Quiz Generator
          </span>
        </button>

        <div className="sidebar-section-label">PLANNING &amp; SCHEDULE</div>
        <button
          className={`sidebar-item ${route === "calendar" ? "active" : ""}`}
          onClick={() => navClick("calendar")}
        >
          <span className="sidebar-item-left">
            <Calendar size={17} /> Academic Calendar
          </span>
        </button>
        <button
          className={`sidebar-item ${route === "routine" ? "active" : ""}`}
          onClick={() => navClick("routine")}
        >
          <span className="sidebar-item-left">
            <Clock size={17} /> Routine Generator
          </span>
        </button>

        <div className="sidebar-section-label">WORKSPACE</div>
        <button
          className={`sidebar-item ${route === "analytics" ? "active" : ""}`}
          onClick={() => navClick("analytics")}
        >
          <span className="sidebar-item-left">
            <BarChart3 size={17} /> Study Analytics
          </span>
        </button>
        <button
          className={`sidebar-item ${route === "sync" ? "active" : ""}`}
          onClick={() => navClick("sync")}
        >
          <span className="sidebar-item-left">
            <RefreshCw size={17} /> UCAM &amp; ELMS Sync
          </span>
        </button>
        <button
          className={`sidebar-item ${route === "feedback" ? "active" : ""}`}
          onClick={() => navClick("feedback")}
        >
          <span className="sidebar-item-left">
            <ThumbsUp size={17} /> Feedback
          </span>
        </button>
        <button
          className={`sidebar-item ${route === "profile" ? "active" : ""}`}
          onClick={() => navClick("profile")}
        >
          <span className="sidebar-item-left">
            <Settings size={17} /> Profile &amp; Privacy
          </span>
        </button>

        {user.role === "admin" && (
          <button
            className="sidebar-item"
            style={{ marginTop: 8, color: "var(--brand-purple)" }}
            onClick={() => navClick("admin")}
          >
            <span className="sidebar-item-left">
              <Shield size={17} /> Admin Panel
            </span>
          </button>
        )}

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
          <button className="sidebar-item" onClick={onLogout} style={{ color: "#dc2626" }}>
            <span className="sidebar-item-left">
              <LogOut size={17} /> Sign Out
            </span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <button
              className="icon-btn mobile-menu-btn"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="topbar-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search course, assignments, notes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search courses and assignments"
              />
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={onToggleTheme}
              title="Toggle light or dark mode"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-btn"
              onClick={() => setNotifOpen(true)}
              title="Notifications"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </button>
            <button
              className="icon-btn"
              onClick={() => navClick("profile")}
              title={`${user.full_name} (${user.email})`}
              aria-label="Profile settings"
            >
              <UserIcon size={18} />
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>

      {notifOpen && (
        <div className="drawer-backdrop" onClick={() => setNotifOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={18} color="var(--brand-purple)" />
                <h3 style={{ fontSize: "1.08rem" }}>Notification Center</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {unreadCount > 0 && (
                  <button className="btn btn-soft btn-sm" onClick={markAllRead}>
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button className="icon-btn" onClick={() => setNotifOpen(false)} aria-label="Close notifications">
                  <X size={16} />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>You are all caught up!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="card"
                    style={{
                      padding: 14,
                      background: n.is_read ? "var(--bg-card)" : "rgba(123, 47, 247, 0.06)",
                      borderColor: n.is_read ? "var(--border-subtle)" : "rgba(123, 47, 247, 0.3)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                      <span className="badge badge-purple">{n.category}</span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                      {n.message}
                    </p>
                    {n.action_route && (
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={() => {
                          setNotifOpen(false);
                          navClick(n.action_route as AppRoute);
                        }}
                      >
                        Open {n.action_route}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
