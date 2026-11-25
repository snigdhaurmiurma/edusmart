import React from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileScan,
  FlaskConical,
  GraduationCap,
  RefreshCw,
  Sparkles,
  ThumbsUp,
} from "lucide-react";

import { EduSmartLogo } from "../components/EduSmartLogo";
import { HeroIllustration } from "../components/HeroIllustration";

interface LandingPageProps {
  onStart: () => void;
  onWatchDemo: () => void;
  demoLoading: boolean;
}

const MODULES = [
  {
    icon: Sparkles,
    title: "UNIQ AI Assistant",
    desc: "Hybrid RAG companion grounded in your personal notes and university policies with clickable action chips.",
    bg: "rgba(123, 47, 247, 0.12)",
    color: "#7b2ff7",
  },
  {
    icon: GraduationCap,
    title: "Advisor Bot",
    desc: "Degree planning, prerequisite checks, and conflict-free next-term course roadmaps.",
    bg: "rgba(29, 85, 196, 0.12)",
    color: "#1d55c4",
  },
  {
    icon: FlaskConical,
    title: "Research Bot",
    desc: "Structured IEEE search strings, methodology checklists, and formatted literature citations.",
    bg: "rgba(224, 0, 168, 0.12)",
    color: "#e000a8",
  },
  {
    icon: FileScan,
    title: "Handwritten Notes Digitizer",
    desc: "Upload lecture photos or PDFs for OCR extraction, low-confidence review flags, and PDF/MD export.",
    bg: "rgba(14, 165, 233, 0.12)",
    color: "#0284c7",
  },
  {
    icon: BookOpen,
    title: "AI Quiz Generator",
    desc: "Generate timed MCQs and short-answer practice exams directly from digitized notes with mastery analytics.",
    bg: "rgba(34, 197, 94, 0.14)",
    color: "#16a34a",
  },
  {
    icon: Calendar,
    title: "Smart Academic Calendar",
    desc: "Color-coded classes, exams, and deadlines with overlap conflict detection, 1-click fixes, and .ics export.",
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#d97706",
  },
  {
    icon: Clock,
    title: "Intelligent Routine Generator",
    desc: "Builds realistic Morning, Afternoon, and Evening study blocks around fixed classes and weak quiz topics.",
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#dc2626",
  },
  {
    icon: RefreshCw,
    title: "UCAM & ELMS Sync",
    desc: "One-click course and assignment reconciliation into your calendar, plus student feedback & admin analytics.",
    bg: "rgba(99, 102, 241, 0.12)",
    color: "#4f46e5",
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onWatchDemo, demoLoading }) => {
  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <EduSmartLogo variant="student" />
        <div className="landing-nav-links">
          <a href="#top">Home</a>
          <span className="landing-nav-sep">|</span>
          <a href="#features">Features</a>
          <span className="landing-nav-sep">|</span>
          <a href="#why-edusmart">Why EduSmart</a>
          <span className="landing-nav-sep">|</span>
          <a href="#support">Support</a>
        </div>
      </nav>

      <section id="top" className="landing-hero">
        <div>
          <h1 className="hero-title">
            Your All-in-One
            <span className="hero-title-gradient">Academic Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Streamline your university experience with AI-powered tools, smart scheduling, and
            seamless system integration. Everything you need to succeed, all in one place.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gradient" onClick={onStart}>
              Start Your Journey <ArrowRight size={18} />
            </button>
            <button className="btn btn-white" onClick={onWatchDemo} disabled={demoLoading}>
              {demoLoading ? "Launching Demo..." : "Watch Demo"}
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat-card">
              <div className="hero-stat-num">8+</div>
              <div className="hero-stat-label">AI-Powered Tools</div>
            </div>
            <div className="hero-stat-card">
              <div className="hero-stat-num">24/7</div>
              <div className="hero-stat-label">Available Support</div>
            </div>
            <div className="hero-stat-card">
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">Free for Students</div>
            </div>
          </div>
        </div>

        <HeroIllustration />
      </section>

      <section id="features" className="landing-section">
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
          <span className="badge badge-purple">Unified Academic Ecosystem</span>
          <h2 style={{ fontSize: "2rem", marginTop: 10 }}>
            Every Academic Workflow Connected in One Loop
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6 }}>
            Digitize handwritten notes, ask grounded questions with citations, generate practice quizzes,
            and schedule adaptive study routines around your weak topics.
          </p>
        </div>

        <div className="module-grid">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="module-card">
                <div className="module-icon" style={{ background: m.bg, color: m.color }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{m.title}</h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="why-edusmart" className="landing-section">
        <div className="card" style={{ padding: 32 }}>
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <span className="badge badge-blue">Research-Backed Design</span>
              <h2 style={{ fontSize: "1.75rem", marginTop: 10 }}>
                Built from Real University Student Feedback
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 12 }}>
                Students shouldn&apos;t have to juggle 6 separate apps for notes, calendars, flashcards,
                advising, and institutional portals. EduSmart unifies them with strict per-student RAG
                privacy isolation and instant exportability.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                {[
                  "Strict tenant-isolated Hybrid RAG (BM25 + dense vector scoring)",
                  "Instant PDF, Markdown, .ics calendar, CSV analytics & GDPR exports",
                  "Dedicated Student Workspace + RBAC Admin Governance Console",
                ].map((pt) => (
                  <div key={pt} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.92rem" }}>
                    <CheckCircle2 size={18} color="#22c55e" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: "var(--bg-subtle)", border: "none" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 14 }}>Platform Capabilities Benchmark</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-strong)" }}>
                    <th style={{ padding: "8px 4px" }}>Capability</th>
                    <th style={{ padding: "8px 4px", color: "var(--brand-purple)" }}>EduSmart</th>
                    <th style={{ padding: "8px 4px", color: "var(--text-muted)" }}>Typical Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["UNIQ + Advisor + Research Bots", "All 3 Integrated", "Fragmented"],
                    ["Handwritten OCR → Quiz Loop", "End-to-End", "Manual Copy"],
                    ["Conflict-Aware Routine Engine", "Auto-Adaptive", "Static Lists"],
                    ["UCAM / ELMS Calendar Sync", "Built-In", "Unavailable"],
                  ].map(([cap, es, other]) => (
                    <tr key={cap} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "9px 4px", fontWeight: 500 }}>{cap}</td>
                      <td style={{ padding: "9px 4px", color: "#16a34a", fontWeight: 700 }}>{es}</td>
                      <td style={{ padding: "9px 4px", color: "var(--text-muted)" }}>{other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <footer id="support" className="landing-section" style={{ paddingTop: 16, paddingBottom: 52 }}>
        <div
          style={{
            background: "var(--grad-auth)",
            borderRadius: 22,
            padding: "36px 32px",
            color: "#ffffff",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.65rem" }}>Ready to Explore EduSmart?</h2>
            <p style={{ margin: "8px 0 0", opacity: 0.92, maxWidth: 520 }}>
              Launch the pre-seeded Student or Admin demo immediately, or create your own free academic account.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-white" onClick={onWatchDemo} disabled={demoLoading}>
              <ThumbsUp size={16} /> Instant Student Demo
            </button>
            <button
              className="btn"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}
              onClick={onStart}
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
