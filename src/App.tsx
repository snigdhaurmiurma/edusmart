import { useEffect, useState } from "react";

import { Layout } from "./components/Layout";
import { apiRequest, getStoredToken, setStoredToken } from "./lib/api";
import { AdminPage } from "./pages/AdminPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ChatPage } from "./pages/ChatPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { LandingPage } from "./pages/LandingPage";
import { NotesPage } from "./pages/NotesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuizPage } from "./pages/QuizPage";
import { RoutinePage } from "./pages/RoutinePage";
import { SyncPage } from "./pages/SyncPage";
import type { AppRoute, User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState<AppRoute>("landing");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchQuery, setSearchQuery] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    apiRequest<User>("/api/auth/me")
      .then((u) => {
        setUser(u);
        setRoute(u.role === "admin" ? "admin" : "dashboard");
      })
      .catch(() => {
        setStoredToken(null);
      });
  }, []);

  const handleAuthSuccess = (token: string, loggedInUser: User) => {
    setStoredToken(token);
    setUser(loggedInUser);
    setRoute(loggedInUser.role === "admin" ? "admin" : "dashboard");
  };

  const handleWatchDemo = async () => {
    setDemoLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "student@edusmart.edu", password: "Student@123" }),
      });
      handleAuthSuccess(data.access_token, data.user);
    } catch {
      setRoute("auth");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setRoute("landing");
  };

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  if (!user) {
    if (route === "auth") {
      return <AuthPage onAuthSuccess={handleAuthSuccess} onBackToLanding={() => setRoute("landing")} />;
    }
    return (
      <LandingPage
        onStart={() => setRoute("auth")}
        onWatchDemo={handleWatchDemo}
        demoLoading={demoLoading}
      />
    );
  }

  if (route === "admin" && user.role === "admin") {
    return (
      <AdminPage
        user={user}
        onNavigate={setRoute}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <Layout
      user={user}
      route={route}
      onNavigate={setRoute}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {route === "dashboard" && <DashboardPage user={user} searchQuery={searchQuery} onNavigate={setRoute} />}
      {route === "chat-uniq" && <ChatPage botType="uniq" onNavigate={setRoute} />}
      {route === "chat-advisor" && <ChatPage botType="advisor" onNavigate={setRoute} />}
      {route === "chat-research" && <ChatPage botType="research" onNavigate={setRoute} />}
      {route === "notes" && <NotesPage searchQuery={searchQuery} onNavigate={setRoute} />}
      {route === "quizzes" && <QuizPage />}
      {route === "calendar" && <CalendarPage />}
      {route === "routine" && <RoutinePage />}
      {route === "sync" && <SyncPage />}
      {route === "analytics" && <AnalyticsPage />}
      {route === "feedback" && <FeedbackPage />}
      {route === "profile" && <ProfilePage user={user} onUserUpdated={setUser} />}
    </Layout>
  );
}
