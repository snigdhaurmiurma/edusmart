import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import type { User } from "../types";
import { EduSmartLogo } from "../components/EduSmartLogo";

interface AuthPageProps {
  onAuthSuccess: (token: string, user: User) => void;
  onBackToLanding: () => void;
}

type AuthMode = "signin" | "signup" | "reset";

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onBackToLanding }) => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loginWithCredentials = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      onAuthSuccess(data.access_token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      await loginWithCredentials(email, password);
      return;
    }

    if (mode === "reset") {
      setLoading(true);
      try {
        const res = await apiRequest<{ message: string }>("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setNotice(res.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to send reset link.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      onAuthSuccess(data.access_token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderFormPane = () => (
    <div className="auth-form-pane">
      <div className="auth-form-inner">
        <div style={{ marginBottom: 26 }}>
          <EduSmartLogo variant="student" onClick={onBackToLanding} />
        </div>

        {mode === "signin" && (
          <>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800 }}>Welcome back</h1>
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 22px" }}>
              Sign in with your account or create a new student workspace
            </p>
          </>
        )}

        {mode === "signup" && (
          <>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800 }}>Create your account</h1>
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 20px" }}>
              Set up your personal EduSmart academic workspace
            </p>
          </>
        )}

        {mode === "reset" && (
          <>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800 }}>Reset your password</h1>
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 22px" }}>
              Enter your email address and we&apos;ll send you a reset link
            </p>
          </>
        )}

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, fontSize: "0.86rem", marginBottom: 14 }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, fontSize: "0.86rem", marginBottom: 14 }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.86rem", marginBottom: 6 }}>Full Name</label>
              <div className="input-icon-wrap">
                <UserIcon size={16} />
                <input className="input" type="text" required placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.86rem", marginBottom: 6 }}>Email Address</label>
            <div className="input-icon-wrap">
              <Mail size={16} />
              <input className="input" type="email" required placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {mode !== "reset" && (
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.86rem", marginBottom: 6 }}>Password</label>
              <div className="input-icon-wrap">
                <Lock size={16} />
                <input className="input" type="password" required placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.86rem", marginBottom: 6 }}>Confirm Password</label>
              <div className="input-icon-wrap">
                <Lock size={16} />
                <input className="input" type="password" required placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          )}

          {mode === "signin" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                <input type="checkbox" defaultChecked /> Remember Me
              </label>
              <button type="button" onClick={() => setMode("reset")} style={{ background: "none", border: "none", color: "var(--text-primary)", fontWeight: 600 }}>
                Forgot Password?
              </button>
            </div>
          )}

          {mode === "signup" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
          )}

          <button type="submit" className="btn btn-gradient" style={{ width: "100%", padding: "12px 16px" }} disabled={loading}>
            {loading ? "Please wait..." : mode === "signin" ? <>Sign In <ArrowRight size={17} /></> : mode === "signup" ? <>Create Account <ArrowRight size={17} /></> : <>Send Reset Link <Send size={16} /></>}
          </button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="auth-divider">Quick Demo Access</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" className="btn btn-white btn-sm" onClick={() => loginWithCredentials("student@edusmart.edu", "Student@123")} disabled={loading}>
                <GraduationCap size={15} /> Student Demo
              </button>
              <button type="button" className="btn btn-white btn-sm" onClick={() => loginWithCredentials("admin@edusmart.edu", "Admin@123")} disabled={loading}>
                <ShieldCheck size={15} /> Admin Demo
              </button>
            </div>
          </>
        )}

        {mode === "reset" && (
          <div className="security-notice-box">
            <strong>Security Notice</strong>
            <div style={{ marginTop: 4 }}>For your security, password reset links expire after 1 hour.</div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.86rem", color: "var(--text-secondary)" }}>
          {mode === "signin" ? (
            <>
              New to EduSmart?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", fontWeight: 700, color: "var(--text-primary)" }}>
                Create a free account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("signin"); setError(null); }} style={{ background: "none", border: "none", fontWeight: 700, color: "var(--text-primary)" }}>
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderGradientPane = () => {
    if (mode === "signup") {
      return (
        <div className="auth-gradient-pane">
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <h2 style={{ fontSize: "2.35rem", lineHeight: 1.15, fontWeight: 800 }}>Your Personal Academic Workspace</h2>
            <p style={{ marginTop: 16, fontSize: "1.02rem", opacity: 0.92, lineHeight: 1.6 }}>
              Organize courses, digitize lecture notes, generate grounded quizzes, and build adaptive study routines in one place.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "28px 0 32px" }}>
              {[
                "Hybrid RAG chatbots grounded in your own notes",
                "Handwritten notes OCR & PDF/Markdown export",
                "Smart calendar with automatic conflict detection",
                "Adaptive study routine & quiz mastery analytics",
                "Granular privacy controls & GDPR data export",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.96rem" }}>
                  <CheckCircle2 size={20} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (mode === "reset") {
      return (
        <div className="auth-gradient-pane">
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(38, 12, 92, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <ShieldCheck size={32} />
            </div>
            <h2 style={{ fontSize: "2.35rem", lineHeight: 1.15, fontWeight: 800 }}>Your Account Security Matters</h2>
            <p style={{ marginTop: 14, opacity: 0.92, lineHeight: 1.6 }}>
              Credentials are protected with PBKDF2-SHA256 hashing, lockout controls, and per-tenant RAG isolation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
              {[
                { icon: ShieldCheck, title: "Encrypted Recovery", desc: "Protected password reset flow" },
                { icon: Clock, title: "Time-Limited Link", desc: "Reset links expire automatically after 1 hour" },
                { icon: CheckCircle2, title: "Private Knowledge Base", desc: "Your notes are strictly isolated to your account" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="auth-glass-card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{card.title}</div>
                      <div style={{ fontSize: "0.84rem", opacity: 0.9 }}>{card.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="auth-gradient-pane">
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.45rem", lineHeight: 1.15, fontWeight: 800 }}>Your Academic Journey Starts Here</h2>
          <p style={{ marginTop: 16, fontSize: "1.02rem", opacity: 0.92, lineHeight: 1.6 }}>
            Access AI-powered tools, smart scheduling, and seamless integration with your university courses.
          </p>
          <div className="auth-glass-card" style={{ display: "flex", alignItems: "center", gap: 14, margin: "30px 0 38px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <GraduationCap size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>All-in-One Platform</div>
              <div style={{ fontSize: "0.86rem", opacity: 0.92 }}>Everything you need for academic success in one place</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div><div style={{ fontSize: "1.95rem", fontWeight: 800 }}>8+</div><div style={{ opacity: 0.92, marginTop: 4 }}>AI Tools</div></div>
            <div><div style={{ fontSize: "1.95rem", fontWeight: 800 }}>24/7</div><div style={{ opacity: 0.92, marginTop: 4 }}>Support</div></div>
            <div><div style={{ fontSize: "1.95rem", fontWeight: 800 }}>100%</div><div style={{ opacity: 0.92, marginTop: 4 }}>Free</div></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="auth-split">
      {mode === "signup" ? <>{renderGradientPane()}{renderFormPane()}</> : <>{renderFormPane()}{renderGradientPane()}</>}
    </div>
  );
};
