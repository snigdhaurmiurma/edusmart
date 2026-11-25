import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  FileScan,
  FlaskConical,
  GraduationCap,
  Layers,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { EduSmartLogo } from "../components/EduSmartLogo";
import { HeroIllustration } from "../components/HeroIllustration";
import { apiRequest } from "../lib/api";
import type { Citation } from "../types";

interface LandingPageProps {
  onStart: () => void;
  onWatchDemo: () => void;
  demoLoading: boolean;
}

interface ModuleSpec {
  id: string;
  category: "ai" | "study" | "planning";
  icon: React.FC<{ size?: number }>;
  title: string;
  tagline: string;
  desc: string;
  highlights: string[];
  bg: string;
  color: string;
}

const MODULES: ModuleSpec[] = [
  {
    id: "uniq",
    category: "ai",
    icon: Sparkles,
    title: "UNIQ RAG Assistant",
    tagline: "Hybrid BM25 + Vector Retrieval",
    desc: "Answers academic & university questions strictly from your own notes and approved policies with inline citations and clickable Action Chips.",
    highlights: ["Pre-ranking per-student tenant isolation", "Live BM25 + Cosine score transparency", "1-click calendar & quiz action chips"],
    bg: "rgba(123, 47, 247, 0.12)",
    color: "#7b2ff7",
  },
  {
    id: "advisor",
    category: "ai",
    icon: GraduationCap,
    title: "Advisor Bot",
    tagline: "Degree & Prerequisite Planner",
    desc: "Evaluates your completed credits, prerequisite chains, and university curriculum rules to recommend conflict-free term plans.",
    highlights: ["Reads enrolled & completed courses", "Checks 138-credit graduation progress", "Grounded in institutional curriculum docs"],
    bg: "rgba(29, 85, 196, 0.12)",
    color: "#1d55c4",
  },
  {
    id: "research",
    category: "ai",
    icon: FlaskConical,
    title: "Research Bot",
    tagline: "IEEE Literature & Methodology",
    desc: "Generates precision IEEE Xplore / ACM search queries, empirical methodology checklists, and formatted IEEE citations.",
    highlights: ["Precision boolean search builders", "Methodology & evaluation checklists", "Grounded in uploaded thesis notes"],
    bg: "rgba(224, 0, 168, 0.12)",
    color: "#e000a8",
  },
  {
    id: "ocr",
    category: "study",
    icon: FileScan,
    title: "Handwritten Notes Digitizer",
    tagline: "Drag-Drop OCR → RAG Index",
    desc: "Upload handwritten photos, PDFs, or text files to extract editable Markdown, flag low-confidence OCR lines, and export to PDF/MD/TXT.",
    highlights: ["Automatic RAG chunk indexing on save", "Low-confidence line highlights & hints", "Cascade vector purge when deleted"],
    bg: "rgba(14, 165, 233, 0.12)",
    color: "#0284c7",
  },
  {
    id: "quiz",
    category: "study",
    icon: BookOpen,
    title: "AI Quiz Generator",
    tagline: "Grounded Active Recall",
    desc: "Turns any digitized note or pasted lecture material into timed MCQs & short-answer quizzes with instant grading and topic mastery.",
    highlights: ["Generate from notes or pasted text", "Countdown timer & instant explanations", "Weak topics automatically flagged"],
    bg: "rgba(34, 197, 94, 0.14)",
    color: "#16a34a",
  },
  {
    id: "calendar",
    category: "planning",
    icon: Calendar,
    title: "Smart Academic Calendar",
    tagline: "Conflict-Aware Scheduling",
    desc: "Month grid + agenda views for classes, exams, and assignments with automatic overlap detection, 1-click auto-resolution, and .ics export.",
    highlights: ["Interactive month grid & agenda views", "Detects overlapping time slots live", "Exports standard .ics calendar files"],
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#d97706",
  },
  {
    id: "routine",
    category: "planning",
    icon: Clock,
    title: "Intelligent Routine Generator",
    tagline: "Adaptive Study Scheduler",
    desc: "Builds realistic Morning, Afternoon, and Evening study plans around fixed classes, urgent deadlines, focus windows, and weak quiz topics.",
    highlights: ["Customizable wake/sleep & break cadence", "Add/toggle custom study blocks", "1-click push routine into Calendar"],
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#dc2626",
  },
  {
    id: "sync",
    category: "planning",
    icon: RefreshCw,
    title: "Courses, Sync & Admin",
    tagline: "UCAM/ELMS + Governance",
    desc: "Manage real courses & assignments, sync institutional portals, export GDPR data, and govern policies through the RBAC Admin Console.",
    highlights: ["Manual courses + UCAM/ELMS sync", "CSV analytics & JSON GDPR exports", "Live Admin RAG telemetry & audit logs"],
    bg: "rgba(99, 102, 241, 0.12)",
    color: "#4f46e5",
  },
];

const STUDY_LOOP = [
  {
    step: "01",
    title: "Digitize & Ingest",
    desc: "Upload handwritten lecture photos, PDFs, or Markdown notes. EduSmart extracts structured text, flags low-confidence OCR lines, and chunks them into your private RAG vector store.",
    badge: "OCR + Chunking",
  },
  {
    step: "02",
    title: "Ask Hybrid RAG Chatbots",
    desc: "Query UNIQ, Advisor, or Research bots. Every query runs hybrid BM25 + dense cosine retrieval with strict pre-ranking tenant isolation and returns cited, grounded answers.",
    badge: "BM25 + Cosine RAG",
  },
  {
    step: "03",
    title: "Practice with AI Quizzes",
    desc: "Generate timed MCQ and short-answer quizzes directly from your digitized notes, get instant explanations, and track topic-by-topic mastery scores.",
    badge: "Active Recall",
  },
  {
    step: "04",
    title: "Auto-Schedule Study Routine",
    desc: "Weak quiz topics and upcoming calendar deadlines feed straight into the Intelligent Routine Generator to schedule conflict-free daily study blocks.",
    badge: "Closed Study Loop",
  },
];

const FAQS = [
  {
    q: "How does EduSmart's RAG chatbot avoid hallucinations and protect my private notes?",
    a: "Before ranking any search results, the Hybrid RAG retriever enforces strict tenant SQL filtering (only your personal chunks + published university policies). Every answer cites the exact retrieved source chunks with BM25 and cosine match scores, and deleting a note immediately cascade-purges its vectors.",
  },
  {
    q: "Can I use my own real courses, notes, and deadlines—not just demo data?",
    a: "Yes! Click 'Start Your Journey' to create your own account with your real name and email. You start with a clean personal workspace where you can add real courses, upload notes/PDFs into RAG, schedule events, generate quizzes, and export everything anytime.",
  },
  {
    q: "Does EduSmart require paid OpenAI or Gemini API keys to run?",
    a: "No! EduSmart runs its built-in Hybrid RAG (BM25 + dense cosine + extractive grounding) out of the box at zero cost. If you optionally set OPENAI_API_KEY or GEMINI_API_KEY in Vercel Environment Variables, it seamlessly upgrades generation using your preferred model.",
  },
  {
    q: "Can I export my notes, calendar, and study progress?",
    a: "Every module supports standard open formats: Notes export to PDF, Markdown, and TXT; Smart Calendar exports to iCalendar (.ics); Analytics exports to CSV; and Profile & Privacy provides 1-click GDPR JSON data export.",
  },
];

interface RagDemoResult {
  answer: string;
  provider: string;
  latency_ms: number;
  corpus_chunks_scanned: number;
  citations: Citation[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onWatchDemo, demoLoading }) => {
  const [category, setCategory] = useState<"all" | "ai" | "study" | "planning">("all");
  const [selectedModule, setSelectedModule] = useState<ModuleSpec>(MODULES[0]);
  const [activeLoopIdx, setActiveLoopIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Live RAG Playground State
  const [ragBot, setRagBot] = useState<"uniq" | "advisor" | "research">("uniq");
  const [ragQuery, setRagQuery] = useState("How do merit scholarships and tuition waivers work?");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RagDemoResult | null>(null);

  // Live Support Form State
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supMsg, setSupMsg] = useState("");
  const [supNotice, setSupNotice] = useState<string | null>(null);

  // Animated Stat Counter
  const [toolCount, setToolCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setToolCount((c) => {
        if (c >= 8) {
          clearInterval(id);
          return 8;
        }
        return c + 1;
      });
    }, 90);
    return () => clearInterval(id);
  }, []);

  const runLiveRagDemo = async (customQuery?: string, customBot?: "uniq" | "advisor" | "research") => {
    const q = (customQuery ?? ragQuery).trim();
    const b = customBot ?? ragBot;
    if (!q) return;
    setRagLoading(true);
    try {
      const res = await apiRequest<RagDemoResult>("/api/public/rag-demo", {
        method: "POST",
        body: JSON.stringify({ query: q, bot_type: b }),
      });
      setRagResult(res);
    } catch {
      // ignore
    } finally {
      setRagLoading(false);
    }
  };

  useEffect(() => {
    runLiveRagDemo();
  }, []);

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ message: string }>("/api/public/support", {
      method: "POST",
      body: JSON.stringify({ name: supName, email: supEmail, message: supMsg }),
    });
    setSupNotice(res.message);
    setSupName("");
    setSupEmail("");
    setSupMsg("");
  };

  const filteredModules = category === "all" ? MODULES : MODULES.filter((m) => m.category === category);

  return (
    <div className="landing-shell">
      {/* Sticky Glass Navbar */}
      <header className="sticky-landing-nav">
        <nav className="landing-nav" style={{ padding: "14px 28px" }}>
          <EduSmartLogo variant="student" compact />
          <div className="landing-nav-links" style={{ flexWrap: "wrap" }}>
            <a href="#top">Home</a>
            <span className="landing-nav-sep">|</span>
            <a href="#features">Features</a>
            <span className="landing-nav-sep">|</span>
            <a href="#rag-demo">Live RAG</a>
            <span className="landing-nav-sep">|</span>
            <a href="#how-it-works">Workflow</a>
            <span className="landing-nav-sep">|</span>
            <a href="#support">Support</a>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-white btn-sm" onClick={onStart}>Sign In</button>
            <button className="btn btn-gradient btn-sm" onClick={onWatchDemo} disabled={demoLoading}>
              {demoLoading ? "Loading..." : "Launch App"}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="top" className="landing-hero">
        <div className="anim-fade-up">
          <h1 className="hero-title">
            Your All-in-One
            <span className="hero-title-gradient">Academic Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Streamline your university life with Hybrid RAG AI chatbots, handwritten notes OCR,
            grounded quiz generation, conflict-aware calendaring, and adaptive study routines—all in one place.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gradient" onClick={onStart}>
              Start Your Journey <ArrowRight size={18} />
            </button>
            <button className="btn btn-white" onClick={onWatchDemo} disabled={demoLoading}>
              {demoLoading ? "Opening Workspace..." : "Watch Demo"}
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat-card anim-fade-up anim-delay-1">
              <div className="hero-stat-num">{toolCount}+</div>
              <div className="hero-stat-label">AI-Powered Tools</div>
            </div>
            <div className="hero-stat-card anim-fade-up anim-delay-1">
              <div className="hero-stat-num">24/7</div>
              <div className="hero-stat-label">Hybrid RAG Support</div>
            </div>
            <div className="hero-stat-card anim-fade-up anim-delay-2">
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">Free for Students</div>
            </div>
          </div>
        </div>

        <div className="anim-float">
          <HeroIllustration />
        </div>
      </section>

      {/* Interactive Feature Card System */}
      <section id="features" className="landing-section">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <span className="badge badge-purple">Interactive Feature Card System</span>
            <h2 style={{ fontSize: "2rem", marginTop: 8 }}>Explore Every EduSmart Module</h2>
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 0", maxWidth: 560 }}>
              Filter by category and click any feature card below to inspect its live capabilities.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All 8 Modules" },
              { id: "ai", label: "AI RAG Chatbots" },
              { id: "study", label: "Study & OCR" },
              { id: "planning", label: "Planning & Sync" },
            ].map((t) => (
              <button
                key={t.id}
                className={`btn btn-sm ${category === t.id ? "btn-gradient" : "btn-white"}`}
                onClick={() => {
                  setCategory(t.id as typeof category);
                  const next = t.id === "all" ? MODULES[0] : MODULES.find((m) => m.category === t.id) || MODULES[0];
                  setSelectedModule(next);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="module-grid">
          {filteredModules.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedModule.id === m.id;
            return (
              <div
                key={m.id}
                className={`module-card module-card-interactive ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedModule(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModule(m)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="module-icon" style={{ background: m.bg, color: m.color }}>
                    <Icon size={22} />
                  </div>
                  <span className="badge badge-blue">{m.tagline}</span>
                </div>
                <h3 style={{ fontSize: "1.06rem", marginBottom: 8 }}>{m.title}</h3>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Selected Feature Spotlight */}
        <div
          key={selectedModule.id}
          className="card anim-fade-up"
          style={{
            marginTop: 22,
            padding: 26,
            borderColor: "rgba(123, 47, 247, 0.3)",
            background: "var(--bg-card)",
          }}
        >
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <span className="badge badge-purple">Selected Module Spotlight</span>
              <h3 style={{ fontSize: "1.45rem", marginTop: 8 }}>{selectedModule.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 8 }}>
                {selectedModule.desc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {selectedModule.highlights.map((h) => (
                  <div key={h} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", fontWeight: 500 }}>
                    <CheckCircle2 size={17} color={selectedModule.color} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <div style={{ padding: 18, borderRadius: 14, background: "var(--bg-subtle)", width: "100%" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                  PRODUCTION CAPABILITY
                </div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>{selectedModule.tagline}</div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Fully wired to the FastAPI backend with real database persistence, instant export, and tenant-safe access controls.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-gradient" onClick={onWatchDemo} disabled={demoLoading}>
                  Try {selectedModule.title} Live <ArrowRight size={16} />
                </button>
                <button className="btn btn-white" onClick={onStart}>Create Free Account</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE Interactive Hybrid RAG Playground */}
      <section id="rag-demo" className="landing-section">
        <div className="card" style={{ padding: 28, border: "2px solid rgba(123, 47, 247, 0.22)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div>
              <span className="badge badge-purple"><Cpu size={13} /> Live Interactive Hybrid RAG Engine</span>
              <h2 style={{ fontSize: "1.75rem", marginTop: 8 }}>Test EduSmart&apos;s Real RAG Pipeline Right Now</h2>
              <p style={{ color: "var(--text-secondary)", margin: "6px 0 0", fontSize: "0.92rem" }}>
                Runs live BM25 lexical + dense cosine vector retrieval over EduSmart&apos;s academic knowledge base in real time.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["uniq", "advisor", "research"] as const).map((b) => (
                <button
                  key={b}
                  className={`btn btn-sm ${ragBot === b ? "btn-gradient" : "btn-soft"}`}
                  onClick={() => {
                    setRagBot(b);
                    runLiveRagDemo(undefined, b);
                  }}
                >
                  {b === "uniq" ? "UNIQ Bot" : b === "advisor" ? "Advisor Bot" : "Research Bot"}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runLiveRagDemo();
            }}
            style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}
          >
            <input
              className="input"
              style={{ flex: "1 1 320px" }}
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="Ask about tuition waivers, CSE prerequisites, Dynamic Programming, or IEEE citations..."
            />
            <button type="submit" className="btn btn-gradient" disabled={ragLoading}>
              <Zap size={16} /> {ragLoading ? "Retrieving..." : "Run Live RAG"}
            </button>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {[
              "How do merit scholarships and tuition waivers work?",
              "What are the two properties of Dynamic Programming and Dijkstra complexity?",
              "What are the CSE degree credit requirements and prerequisites?",
              "What are the rules for IEEE citations and medical exam deferrals?",
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => {
                  setRagQuery(sample);
                  runLiveRagDemo(sample);
                }}
              >
                {sample}
              </button>
            ))}
          </div>

          {ragResult && (
            <div className="grid-2 anim-fade-up" style={{ alignItems: "start" }}>
              <div style={{ padding: 18, borderRadius: 14, background: "var(--bg-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <strong style={{ fontSize: "0.94rem" }}>Grounded RAG Response</strong>
                  <span className="badge badge-green">
                    {ragResult.latency_ms} ms • {ragResult.corpus_chunks_scanned} chunks scanned
                  </span>
                </div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-primary)" }}>
                  {ragResult.answer}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Database size={14} /> TOP RETRIEVED VECTOR CHUNKS (BM25 + COSINE FUSION)
                </div>
                {ragResult.citations.length === 0 ? (
                  <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)", fontSize: "0.86rem", color: "var(--text-muted)" }}>
                    No chunks matched above threshold. Try one of the academic sample queries above!
                  </div>
                ) : (
                  ragResult.citations.map((c) => (
                    <div key={c.chunk_id} style={{ padding: 13, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <strong style={{ fontSize: "0.86rem" }}>{c.title}</strong>
                        <span className="badge badge-purple">{Math.round(c.score * 100)}% match</span>
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                        {c.excerpt}...
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        <span>BM25: {Math.round((c.bm25_score || 0) * 100)}%</span>
                        <div className="rag-score-bar"><div className="rag-score-fill" style={{ width: `${Math.min(100, Math.round(c.score * 100))}%` }} /></div>
                        <span>Cosine: {Math.round((c.cosine_score || 0) * 100)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive 4-Step Connected Study Loop */}
      <section id="how-it-works" className="landing-section">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 28px" }}>
          <span className="badge badge-blue"><Layers size={13} /> Connected Architecture</span>
          <h2 style={{ fontSize: "1.9rem", marginTop: 8 }}>One Unified Study Loop—Not 8 Disconnected Tabs</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
          {STUDY_LOOP.map((item, idx) => (
            <button
              key={item.step}
              onClick={() => setActiveLoopIdx(idx)}
              className={`card module-card-interactive ${activeLoopIdx === idx ? "selected" : ""}`}
              style={{ textAlign: "left", padding: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 800, color: "var(--brand-purple)" }}>
                  {item.step}
                </span>
                <span className="badge badge-blue">{item.badge}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{item.title}</div>
            </button>
          ))}
        </div>

        <div key={activeLoopIdx} className="card anim-fade-up" style={{ padding: 24, background: "var(--bg-subtle)", border: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ maxWidth: 740 }}>
              <span className="badge badge-purple">Step {STUDY_LOOP[activeLoopIdx].step}</span>
              <h3 style={{ fontSize: "1.3rem", marginTop: 8 }}>{STUDY_LOOP[activeLoopIdx].title}</h3>
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {STUDY_LOOP[activeLoopIdx].desc}
              </p>
            </div>
            <button className="btn btn-gradient" onClick={onWatchDemo} disabled={demoLoading}>
              Experience Step {STUDY_LOOP[activeLoopIdx].step} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Interactive FAQ + Real Support Form */}
      <section id="support" className="landing-section" style={{ paddingBottom: 64 }}>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <span className="badge badge-blue"><ShieldCheck size={13} /> Questions &amp; Privacy</span>
            <h2 style={{ fontSize: "1.7rem", margin: "8px 0 18px" }}>Frequently Asked Questions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button className="faq-trigger" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                      <span>{item.q}</span>
                      <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 16px", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 26 }}>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 6 }}>Need Help or Campus Integration?</h3>
            <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Send a message directly to the EduSmart support &amp; admin console.
            </p>
            {supNotice && (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: "0.86rem", fontWeight: 600 }}>
                {supNotice}
              </div>
            )}
            <form onSubmit={submitSupport} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input" required placeholder="Your Name" value={supName} onChange={(e) => setSupName(e.target.value)} />
              <input className="input" type="email" required placeholder="you@university.edu" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
              <textarea className="textarea" rows={4} required placeholder="Tell us how we can help..." value={supMsg} onChange={(e) => setSupMsg(e.target.value)} />
              <button type="submit" className="btn btn-gradient">
                <Send size={15} /> Send Support Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
